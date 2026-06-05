"""
Hook SessionStart — inyecta CONTEXT.md y estado del grafo graphify.
Ejecutado automáticamente por Claude Code al iniciar cada sesión.
"""
import json
import pathlib
import subprocess
import sys

root = pathlib.Path(".")
context_file = root / "CONTEXT.md"
graph_file   = root / "graphify-out" / "graph.json"
report_file  = root / "graphify-out" / "GRAPH_REPORT.md"

lines = []

# 1. Resumen compacto del proyecto
if context_file.exists():
    lines.append("## CONTEXT.md — InLab Palex (resumen de proyecto)\n")
    lines.append(context_file.read_text(encoding="utf-8"))
    lines.append("")

# 2. Estado del grafo graphify
if graph_file.exists():
    try:
        import json as _json
        g = _json.loads(graph_file.read_text(encoding="utf-8"))
        nodes = len(g.get("nodes", []))
        edges = len(g.get("edges", []))
        lines.append(f"## Grafo graphify disponible ({nodes} nodos · {edges} edges)")
        lines.append("Usa `graphify query \"<pregunta>\"` antes de leer archivos raw.")
        lines.append("")
    except Exception:
        lines.append("## Grafo graphify disponible — usa `graphify query` para consultas.")
        lines.append("")

output = {
    "continue": True,
    "suppressOutput": True,
    "status": "ready",
}

if lines:
    output["additionalContext"] = "\n".join(lines)

print(json.dumps(output))
