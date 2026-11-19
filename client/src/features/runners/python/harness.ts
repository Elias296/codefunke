/**
 * Python-Code, der in Pyodide geladen wird (im Browser-Worker und in den Tests).
 *
 * HARNESS_PY  – führt Programme aus, fängt Fehler mit Zeilennummer ab und
 *               prüft Aufgaben (Ausgabe, Tests).
 * TURTLE_PY   – ein eigenes turtle-Modul: Es rechnet in Python und schickt
 *               Zeichenbefehle an die Webseite (die Original-Turtle braucht
 *               ein Desktop-Fenster und läuft im Browser nicht).
 */

export const HARNESS_PY = String.raw`
import sys, io, json, traceback, builtins, difflib, contextlib
import _cf_bridge

_CF_MAX_OUTPUT = 200_000

class _CfLimitedIO(io.StringIO):
    def write(self, s):
        if self.tell() + len(s) > _CF_MAX_OUTPUT:
            raise RuntimeError("__CF_TOO_MUCH_OUTPUT__")
        return super().write(s)

def _cf_make_input(read_line, echo):
    def input(prompt=""):
        sys.stdout.write(str(prompt))
        sys.stdout.flush()
        line = read_line(str(prompt))
        if line is None:
            raise EOFError("__CF_NO_INPUT__")
        line = str(line)
        if echo:
            sys.stdout.write(line + "\n")
        return line
    return input

def _cf_suggest(name, candidates):
    match = difflib.get_close_matches(name, [c for c in candidates if not c.startswith("_")], n=1, cutoff=0.7)
    return match[0] if match else None

def _cf_error_info(exc, user_globals):
    info = {"type": type(exc).__name__, "message": str(exc), "line": None, "col": None, "text": None, "suggestion": None, "name": None}
    if isinstance(exc, SyntaxError):
        info["message"] = exc.msg or str(exc)
        if exc.filename == "main.py":
            info["line"] = exc.lineno
            info["col"] = exc.offset
            info["text"] = (exc.text or "").rstrip("\n")
    else:
        for frame, lineno in traceback.walk_tb(exc.__traceback__):
            if frame.f_code.co_filename == "main.py":
                info["line"] = lineno
    if isinstance(exc, NameError) and getattr(exc, "name", None):
        info["name"] = exc.name
        info["suggestion"] = _cf_suggest(exc.name, list(dir(builtins)) + list(user_globals.keys()))
    if isinstance(exc, AttributeError) and getattr(exc, "name", None):
        info["name"] = exc.name
        obj = getattr(exc, "obj", None)
        if obj is not None:
            info["suggestion"] = _cf_suggest(exc.name, dir(obj))
    return info

def _cf_fresh_globals(read_line, echo):
    for mod in ("turtle", "funki"):
        sys.modules.pop(mod, None)
    g = {"__name__": "__main__", "__builtins__": builtins}
    g["input"] = _cf_make_input(read_line, echo)
    return g

def _cf_exec(code, g):
    """Führt Code aus. Gibt None oder ein Fehler-Dict zurück."""
    try:
        compiled = compile(code, "main.py", "exec")
    except SyntaxError as e:
        return _cf_error_info(e, g)
    try:
        exec(compiled, g)
    except SystemExit:
        pass
    except KeyboardInterrupt:
        return {"type": "KeyboardInterrupt", "message": "", "line": None}
    except BaseException as e:
        return _cf_error_info(e, g)
    finally:
        try:
            sys.stdout.flush()
            if "turtle" in sys.modules:
                sys.modules["turtle"]._flush()
        except Exception:
            pass
    return None

def _cf_run_live(code):
    """Normales Ausführen: Ausgabe geht direkt an die Webseite."""
    g = _cf_fresh_globals(_cf_bridge.read_line, False)
    err = _cf_exec(code, g)
    return json.dumps({"ok": err is None, "error": err})

def _cf_run_checks(code, groups_json):
    """Prüft Aufgaben: pro Gruppe (gleiche Eingaben) einmal ausführen, dann Tests."""
    results = []
    for group in json.loads(groups_json):
        inputs = list(group.get("inputs") or [])
        def read_line(prompt, _inputs=inputs):
            return _inputs.pop(0) if _inputs else None
        g = _cf_fresh_globals(read_line, True)
        buf = _CfLimitedIO()
        with contextlib.redirect_stdout(buf):
            err = _cf_exec(code, g)
        output = buf.getvalue()
        tests = []
        if err is None:
            g["__output__"] = output
            for test in group.get("tests") or []:
                tbuf = io.StringIO()
                try:
                    with contextlib.redirect_stdout(tbuf):
                        exec(compile(test, "test.py", "exec"), g)
                    tests.append({"ok": True})
                except AssertionError as e:
                    tests.append({"ok": False, "error": {"type": "AssertionError", "message": str(e)}})
                except BaseException as e:
                    tests.append({"ok": False, "error": _cf_error_info(e, g)})
        results.append({"output": output, "error": err, "tests": tests, "unusedInputs": len(inputs)})
    return json.dumps(results)
`;

export const TURTLE_PY = String.raw`
"""Codefunke-Turtle: zeichnet auf der Webseite. Befehle wie im Original-Modul."""
import math as _math
import json as _json
import _cf_bridge

_buffer = []
_turtles = []
_segments = []   # alle gemalten Linien: ((x1, y1), (x2, y2)) – praktisch für Prüfungen
_bg = "white"

_NAMED = {"rot": "red", "blau": "blue", "grün": "green", "gelb": "yellow", "schwarz": "black", "weiß": "white",
          "orange": "orange", "lila": "purple", "pink": "pink", "grau": "gray", "braun": "brown", "türkis": "turquoise"}

def _flush():
    if _buffer:
        _cf_bridge.turtle(_json.dumps(_buffer))
        _buffer.clear()

def _emit(cmd):
    _buffer.append(cmd)
    if len(_buffer) >= 40:
        _flush()

def _color(args):
    if len(args) == 1:
        c = args[0]
        if isinstance(c, (tuple, list)):
            return _rgb(*c)
        c = str(c)
        return _NAMED.get(c.lower(), c)
    if len(args) == 3:
        return _rgb(*args)
    raise TypeError("Farbe: z. B. 'red', '#ff0000' oder (1, 0, 0)")

def _rgb(r, g, b):
    if max(r, g, b) <= 1:
        r, g, b = r * 255, g * 255, b * 255
    return "#%02x%02x%02x" % (int(r), int(g), int(b))

class Turtle:
    def __init__(self, shape="turtle"):
        self._id = len(_turtles)
        _turtles.append(self)
        self._x = 0.0
        self._y = 0.0
        self._heading = 0.0
        self._down = True
        self._pencolor = "black"
        self._fillcolor = "black"
        self._width = 2
        self._visible = True
        self._speed = 6
        self._filling = False
        self._fill_path = []
        _emit({"op": "new", "t": self._id})

    # --- Bewegung
    def forward(self, distance):
        rad = _math.radians(self._heading)
        self._move(self._x + distance * _math.cos(rad), self._y + distance * _math.sin(rad))
    fd = forward

    def backward(self, distance):
        self.forward(-distance)
    back = bk = backward

    def right(self, angle):
        self._turn(-angle)
    rt = right

    def left(self, angle):
        self._turn(angle)
    lt = left

    def goto(self, x, y=None):
        if y is None:
            x, y = x
        self._move(float(x), float(y))
    setpos = setposition = goto

    def setx(self, x):
        self._move(float(x), self._y)

    def sety(self, y):
        self._move(self._x, float(y))

    def setheading(self, angle):
        self._heading = float(angle) % 360
        _emit({"op": "turn", "t": self._id, "h": self._heading})
    seth = setheading

    def home(self):
        self.goto(0, 0)
        self.setheading(0)

    def circle(self, radius, extent=None, steps=None):
        extent = 360 if extent is None else extent
        steps = steps or max(12, int(abs(extent) / 6))
        step_angle = extent / steps
        step_len = 2 * abs(radius) * _math.sin(_math.radians(abs(step_angle) / 2))
        direction = 1 if radius >= 0 else -1
        self._turn(direction * step_angle / 2)
        for _ in range(steps):
            self.forward(step_len)
            self._turn(direction * step_angle)
        self._turn(-direction * step_angle / 2)

    def dot(self, size=None, *color):
        c = _color(color) if color else self._pencolor
        _emit({"op": "dot", "t": self._id, "x": self._x, "y": self._y, "size": size or max(self._width + 4, self._width * 2), "color": c})

    def write(self, text, move=False, align="left", font=("Arial", 14, "normal")):
        size = font[1] if isinstance(font, (tuple, list)) and len(font) > 1 else 14
        _emit({"op": "write", "t": self._id, "x": self._x, "y": self._y, "text": str(text), "align": align, "size": size, "color": self._pencolor})

    def _turn(self, angle):
        self._heading = (self._heading + angle) % 360
        _emit({"op": "turn", "t": self._id, "h": self._heading})

    def _move(self, x, y):
        if self._down:
            _segments.append(((round(self._x, 2), round(self._y, 2)), (round(x, 2), round(y, 2))))
        if self._filling:
            self._fill_path.append((x, y))
        _emit({"op": "move", "t": self._id, "x": x, "y": y, "pen": self._down, "color": self._pencolor, "w": self._width})
        self._x, self._y = x, y

    # --- Stift
    def penup(self):
        self._down = False
    pu = up = penup

    def pendown(self):
        self._down = True
    pd = down = pendown

    def isdown(self):
        return self._down

    def pensize(self, width=None):
        if width is None:
            return self._width
        self._width = width
    width = pensize

    def pencolor(self, *args):
        if not args:
            return self._pencolor
        self._pencolor = _color(args)

    def fillcolor(self, *args):
        if not args:
            return self._fillcolor
        self._fillcolor = _color(args)

    def color(self, *args):
        if not args:
            return (self._pencolor, self._fillcolor)
        if len(args) == 2:
            self._pencolor, self._fillcolor = _color(args[:1]), _color(args[1:])
        else:
            self._pencolor = self._fillcolor = _color(args)

    def begin_fill(self):
        self._filling = True
        self._fill_path = [(self._x, self._y)]

    def end_fill(self):
        if self._filling and len(self._fill_path) > 2:
            _emit({"op": "fill", "t": self._id, "points": self._fill_path, "color": self._fillcolor})
        self._filling = False

    # --- Zustand
    def position(self):
        return (round(self._x, 2), round(self._y, 2))
    pos = position

    def xcor(self):
        return round(self._x, 2)

    def ycor(self):
        return round(self._y, 2)

    def heading(self):
        return round(self._heading, 2)

    def distance(self, x, y=None):
        if y is None:
            x, y = x
        return _math.hypot(x - self._x, y - self._y)

    def speed(self, s=None):
        if s is None:
            return self._speed
        self._speed = s
        _emit({"op": "speed", "t": self._id, "speed": s})

    def hideturtle(self):
        self._visible = False
        _emit({"op": "visible", "t": self._id, "v": False})
    ht = hideturtle

    def showturtle(self):
        self._visible = True
        _emit({"op": "visible", "t": self._id, "v": True})
    st = showturtle

    def isvisible(self):
        return self._visible

    def shape(self, name=None):
        return "turtle"

    def clear(self):
        _emit({"op": "clear"})

    def reset(self):
        self.clear()
        self.penup(); self.home(); self.pendown()

class _Screen:
    def bgcolor(self, *args):
        global _bg
        if not args:
            return _bg
        _bg = _color(args)
        _emit({"op": "bg", "color": _bg})
    def title(self, *a): pass
    def setup(self, *a, **k): pass
    def tracer(self, *a, **k): pass
    def update(self): _flush()
    def mainloop(self): _flush()
    def exitonclick(self): _flush()
    def bye(self): _flush()
    def listen(self): pass
    def onkey(self, *a): pass

_screen = _Screen()

def Screen():
    return _screen

_default_turtle = None

def _t():
    global _default_turtle
    if _default_turtle is None:
        _default_turtle = Turtle()
    return _default_turtle

def _make(name):
    def f(*args, **kwargs):
        return getattr(_t(), name)(*args, **kwargs)
    f.__name__ = name
    return f

for _name in ["forward", "fd", "backward", "back", "bk", "right", "rt", "left", "lt", "goto", "setpos", "setposition",
              "setx", "sety", "setheading", "seth", "home", "circle", "dot", "write", "penup", "pu", "up", "pendown", "pd",
              "down", "isdown", "pensize", "width", "pencolor", "fillcolor", "color", "begin_fill", "end_fill", "position",
              "pos", "xcor", "ycor", "heading", "distance", "speed", "hideturtle", "ht", "showturtle", "st", "isvisible",
              "shape", "clear", "reset"]:
    globals()[_name] = _make(_name)

def bgcolor(*args):
    return _screen.bgcolor(*args)

def done():
    _flush()
mainloop = exitonclick = done

_emit({"op": "reset"})
`;
