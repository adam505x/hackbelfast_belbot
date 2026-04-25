"""ChromaDB vector store for Belfast city intelligence RAG."""

import chromadb

_client = None
_collection = None

# Belfast city intelligence knowledge base
DOCUMENTS = [
    {
        "id": "flood-lagan",
        "text": "The River Lagan is the primary flood risk corridor in Belfast. It flows through the city centre past Stranmillis, Ormeau, and the Lagan Weir before entering Belfast Lough. The Lagan Weir, completed in 1994, helps manage tidal flooding but fluvial flood risk remains significant during heavy rainfall. DfI Rivers estimates over 8,000 residential properties are at high risk of fluvial flooding in the Belfast APSFR area.",
        "metadata": {"layer": "flood", "area": "lagan"},
    },
    {
        "id": "flood-tidal",
        "text": "Belfast Lough presents significant tidal and coastal flood risk, particularly to the Titanic Quarter, Belfast Harbour, and Sydenham areas. UKCP18 climate projections suggest sea levels around Belfast could rise by 0.5-1.1m by 2100 under high emission scenarios. The Harbour Estate and Titanic Quarter are built on reclaimed land at elevations of 1-3m AOD, making them vulnerable to storm surge events combined with sea level rise.",
        "metadata": {"layer": "flood", "area": "harbour"},
    },
    {
        "id": "flood-surface",
        "text": "Surface water (pluvial) flooding is the most widespread flood risk in Belfast, affecting over 32,000 residential properties at low probability. The Blackstaff River, largely culverted beneath the city centre, and the Farset River are particular hotspots. The Connswater Community Greenway project has improved flood management in East Belfast through sustainable drainage and channel widening.",
        "metadata": {"layer": "flood", "area": "surface_water"},
    },
    {
        "id": "grid-capacity",
        "text": "Belfast's electricity network is managed by NIE Networks (distribution) and SONI (transmission). The main 275kV substation at Castlereagh serves as the primary bulk supply point. Belfast North 110kV and Harbour 110kV substations provide high-capacity connections. Grid capacity in the Harbour Estate area is strong due to industrial legacy infrastructure, making it attractive for data centre development. West Belfast has lower grid capacity with primarily 11kV distribution.",
        "metadata": {"layer": "grid", "area": "belfast"},
    },
    {
        "id": "grid-renewables",
        "text": "Northern Ireland generates approximately 40% of its electricity from renewable sources, primarily onshore wind. Belfast Harbour has planning permission for a 2MW wind turbine. The all-island electricity market (SEM) managed by SONI and EirGrid provides grid stability. NIE Networks is investing in smart grid technology to support increased renewable penetration and electric vehicle charging infrastructure.",
        "metadata": {"layer": "grid", "area": "renewables"},
    },
    {
        "id": "decay-shankill",
        "text": "The Shankill ward is ranked among the top 5 most deprived areas in Northern Ireland according to NIMDM 2017. It scores highly on income deprivation (42% of population income-deprived), employment deprivation, and health deprivation domains. Population has declined from over 20,000 in the 1970s to approximately 6,100. Significant derelict land exists along the Shankill Road corridor.",
        "metadata": {"layer": "decay", "area": "shankill"},
    },
    {
        "id": "decay-falls",
        "text": "The Falls ward and surrounding areas (Clonard, Beechmount, Whiterock) form a contiguous zone of high deprivation in West Belfast. NIMDM 2017 ranks these areas in the top 20 most deprived SOAs. Despite this, West Belfast has seen significant community-led regeneration including the Gaeltacht Quarter and Conway Mill. The Springfield Road corridor has potential for mixed-use development.",
        "metadata": {"layer": "decay", "area": "falls"},
    },
    {
        "id": "decay-contrast",
        "text": "Belfast exhibits stark spatial inequality. South Belfast wards like Malone and Stranmillis rank among the least deprived in Northern Ireland, while North and West Belfast wards rank among the most deprived. This deprivation gap has persisted across multiple NIMDM cycles (2005, 2010, 2017). The interface areas between communities often show the highest deprivation scores.",
        "metadata": {"layer": "decay", "area": "inequality"},
    },
    {
        "id": "datacentre-harbour",
        "text": "Belfast Harbour Estate is the primary data centre opportunity zone. It offers: proximity to 110kV grid infrastructure, direct fibre trunk access via the submarine cable landing at Whitehouse, flat industrial land, and cooling water from Belfast Lough. However, tidal flood risk requires mitigation. The Harbour Commissioners have designated areas for technology and innovation use. Several existing data centres operate in the area.",
        "metadata": {"layer": "datacentre", "area": "harbour"},
    },
    {
        "id": "datacentre-castlereagh",
        "text": "The Castlereagh area in East Belfast offers strong data centre potential due to the adjacent 275kV substation (highest voltage in Belfast), relatively low flood risk, and available industrial land. The area is well-connected by road (A55 Outer Ring) but fibre infrastructure is less developed than the Harbour area. Land costs are lower than city centre locations.",
        "metadata": {"layer": "datacentre", "area": "castlereagh"},
    },
    {
        "id": "planning-context",
        "text": "Belfast City Council's Local Development Plan (LDP) designates key development sites including the Belfast Harbour area, Titanic Quarter, and North Foreshore for mixed-use regeneration. The Strategic Planning Policy Statement (SPPS) requires flood risk assessment for all development in flood-prone areas. Enterprise Zones in deprived areas offer enhanced capital allowances and business rate relief, making derelict sites in deprived wards financially attractive for development.",
        "metadata": {"layer": "planning", "area": "belfast"},
    },
    {
        "id": "climate-projections",
        "text": "UKCP18 projections for Belfast indicate: mean temperature increase of 1-4°C by 2080, winter rainfall increase of 10-30%, summer rainfall decrease of 10-40%, and sea level rise of 0.3-1.1m by 2100. Extreme rainfall events are projected to intensify by 10-40%, increasing surface water flood risk. The Belfast Resilience Strategy identifies flooding as the city's primary climate risk.",
        "metadata": {"layer": "climate", "area": "belfast"},
    },
]


def init_vector_store():
    """Initialise ChromaDB with Belfast intelligence documents."""
    global _client, _collection
    _client = chromadb.Client()
    _collection = _client.get_or_create_collection(
        name="belfast_intelligence",
        metadata={"hnsw:space": "cosine"},
    )

    existing = _collection.count()
    if existing == 0:
        _collection.add(
            ids=[d["id"] for d in DOCUMENTS],
            documents=[d["text"] for d in DOCUMENTS],
            metadatas=[d["metadata"] for d in DOCUMENTS],
        )
        print(f"Loaded {len(DOCUMENTS)} documents into vector store")
    else:
        print(f"Vector store already has {existing} documents")


def query_knowledge(query: str, n_results: int = 4, layer_filter: str | None = None):
    """Query the knowledge base, optionally filtered by layer."""
    if _collection is None:
        init_vector_store()

    where = {"layer": layer_filter} if layer_filter else None
    results = _collection.query(
        query_texts=[query],
        n_results=n_results,
        where=where,
    )
    return results
