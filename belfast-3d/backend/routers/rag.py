"""RAG-powered natural language query interface using Claude."""

import os
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter()


class QueryRequest(BaseModel):
    question: str
    layer: str | None = None  # Optional: flood, grid, decay, datacentre


class QueryResponse(BaseModel):
    answer: str
    sources: list[str]
    layer_suggestion: str | None = None
    coordinates: list[float] | None = None


class WhatIfRequest(BaseModel):
    scenario: str  # e.g. "What if sea level rises 2m?"
    current_layers: list[str] = []


SYSTEM_PROMPT = """You are the Belfast 3D City Intelligence Assistant. You help users understand
flood risk, power grid capacity, urban decay patterns, and data centre siting opportunities
in Belfast, Northern Ireland.

You have access to a knowledge base of Belfast-specific intelligence data. Use the provided
context to give accurate, specific answers. Always reference Belfast locations, real data
sources (DfI Rivers, NISRA NIMDM 2017, NIE Networks, SONI), and specific statistics when available.

When suggesting map actions, format them as:
- ZOOM: [lng, lat, zoom_level] — to navigate the map
- LAYER: layer_name — to toggle a layer on
- HIGHLIGHT: area_name — to highlight a specific area

Keep answers concise and actionable. This is a hackathon demo — be impressive but accurate."""


@router.post("/query", response_model=QueryResponse)
async def query_intelligence(req: QueryRequest):
    """Answer natural language questions about Belfast using RAG."""
    from services.vector_store import query_knowledge

    # Retrieve relevant context
    results = query_knowledge(req.question, n_results=4, layer_filter=req.layer)
    context_docs = results.get("documents", [[]])[0]
    source_ids = results.get("ids", [[]])[0]
    context = "\n\n".join(context_docs)

    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        # Fallback: return context directly without Claude
        return QueryResponse(
            answer=f"Based on Belfast intelligence data:\n\n{context}",
            sources=source_ids,
            layer_suggestion=req.layer,
        )

    try:
        import anthropic
        client = anthropic.Anthropic(api_key=api_key)

        message = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=1024,
            system=SYSTEM_PROMPT,
            messages=[
                {
                    "role": "user",
                    "content": f"""Context from Belfast intelligence database:

{context}

User question: {req.question}

Provide a concise, data-driven answer. Include specific locations, statistics, and
actionable insights. If relevant, suggest which map layer to view.""",
                }
            ],
        )

        answer = message.content[0].text

        # Extract layer suggestion from answer
        layer_map = {
            "flood": ["flood", "lagan", "tidal", "sea level", "surface water"],
            "grid": ["grid", "substation", "voltage", "power", "renewable", "NIE"],
            "decay": ["deprivation", "deprived", "decay", "derelict", "NIMDM"],
            "datacentre": ["data centre", "datacenter", "fibre", "cooling", "site"],
        }
        suggested_layer = None
        answer_lower = answer.lower()
        for layer, keywords in layer_map.items():
            if any(kw in answer_lower for kw in keywords):
                suggested_layer = layer
                break

        return QueryResponse(
            answer=answer,
            sources=source_ids,
            layer_suggestion=suggested_layer,
        )

    except Exception as e:
        # Fallback to context-only response
        return QueryResponse(
            answer=f"Based on Belfast intelligence data:\n\n{context}",
            sources=source_ids,
            layer_suggestion=req.layer,
        )


@router.post("/what-if", response_model=QueryResponse)
async def what_if_scenario(req: WhatIfRequest):
    """Run what-if scenario analysis."""
    from services.vector_store import query_knowledge

    results = query_knowledge(req.scenario, n_results=4)
    context_docs = results.get("documents", [[]])[0]
    source_ids = results.get("ids", [[]])[0]
    context = "\n\n".join(context_docs)

    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        return QueryResponse(
            answer=f"Scenario analysis based on available data:\n\n{context}",
            sources=source_ids,
        )

    try:
        import anthropic
        client = anthropic.Anthropic(api_key=api_key)

        message = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=1500,
            system=SYSTEM_PROMPT,
            messages=[
                {
                    "role": "user",
                    "content": f"""Context from Belfast intelligence database:

{context}

What-if scenario: {req.scenario}
Currently active layers: {', '.join(req.current_layers) or 'none'}

Analyse this scenario for Belfast. Include:
1. Which areas would be most affected
2. Quantitative impact estimates where possible
3. Which map layers to examine
4. Recommended actions or adaptations""",
                }
            ],
        )

        return QueryResponse(
            answer=message.content[0].text,
            sources=source_ids,
        )

    except Exception as e:
        return QueryResponse(
            answer=f"Scenario analysis based on available data:\n\n{context}",
            sources=source_ids,
        )
