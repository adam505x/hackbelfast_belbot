// Construction/completion years for notable Belfast buildings
// Buildings not in this list are treated as pre-2001 (always visible)
// Sources: Wikipedia, Belfast City Council planning records, news articles

const BUILDING_YEARS = {
  // Modern landmarks (post-2000)
  100129: 2011, // Obel Tower
  84786: 2023,  // Grand Central Hotel
  1370: 2012,   // RVH Critical Care Building
  42915: 1998,  // Hilton Belfast
  42913: 2009,  // BT Riverside Tower
  39526: 2019,  // Causeway Tower
  43119: 2018,  // Elms BT2 (student)
  42914: 2006,  // Lanyon Plaza
  40613: 2019,  // Maldron Hotel Belfast City
  737: 2009,    // Fitzwilliam Hotel
  39604: 2009,  // Fitzwilliam Hotel (annex)
  100333: 2019, // Student Roost Great Patrick St
  103719: 2020, // Student Roost Little Patrick St
  553: 2017,    // Hampton by Hilton
  645: 2008,    // IBIS Belfast
  39578: 2008,  // IBIS (second)
  101715: 2022, // AC Hotel Belfast
  100457: 2012, // Titanic Belfast
  99970: 2012,  // Titanic Studios
  99999: 2011,  // PRONI (Public Record Office)
  100006: 2000, // Odyssey Place / SSE Arena
  100247: 2000, // SSE Arena
  43075: 2008,  // Victoria Square
  99947: 1990,  // CastleCourt
  100809: 2016, // City Quays 1
  100976: 2018, // City Quays 2
  102191: 2019, // City Quays Car Park
  39073: 2006,  // PwC building
  39313: 2020,  // voco hotel
  39549: 2005,  // Adelaide Exchange
  100097: 2015, // Premier Inn Titanic Quarter
  39532: 2017,  // The Vantage
  84258: 2016,  // Elms BT1 (student)
  40914: 2019,  // UrbanHQ
  100433: 2015, // Jennymount Mill (conversion)
  99959: 2014,  // Capita building
  16: 2005,     // Holiday Inn
  39416: 2018,  // 78-86 Dublin Road
  39392: 2017,  // #9 Adelaide
  38784: 2020,  // Bankmore House (refurb)
  100354: 1869, // Albert Memorial Clock

  // Titanic Quarter / Harbour
  100154: 1854, // Belfast Harbour Office
  40784: 1861,  // Harland & Wolff
  99991: 1989,  // Spirit AeroSystems (as Shorts/Bombardier)
  99998: 2005,  // Bombardier Engineering Centre
  100004: 1960, // Bombardier Main Factory
  100076: 1983, // Belfast City Airport

  // Historic / Victorian
  40538: 1906,  // Belfast City Hall
  2: 1849,      // Queen's University Lanyon Building
  42925: 1788,  // Linen Hall Library
  283: 1971,    // Europa Hotel
  39216: 1971,  // Europa Hotel (tower)
  67: 1966,     // Divis Tower
  84904: 1966,  // Divis Tower (duplicate)
  42910: 1997,  // Waterfront Hall
  39326: 2006,  // Waterfront Plaza
  38963: 1941,  // BBC Broadcasting House

  // Hospitals
  121: 1906,    // Royal Victoria Hospital (main)
  84936: 1883,  // Mater Hospital

  // Office / Commercial (post-2000)
  39178: 2002,  // Invest NI
  45925: 2018,  // Allstate NI (new building)
  39217: 2017,  // Concentrix
  38771: 2015,  // FinTrU area
  465: 1997,    // Kainos (Upper Crescent)
  39074: 1972,  // Danske Bank HQ
  40544: 1966,  // Bedford House (EY)
  100159: 1990, // Clarendon Building (KPMG)
  102038: 1967, // River House
  38955: 1975,  // Centrepoint
  39072: 1902,  // Scottish Provident Building
  39385: 1980,  // DfC building
  39312: 1980,  // DfC (Lighthouse)
  39118: 2000,  // Equality House
  39433: 1970,  // Goodwood House
  552: 1970,    // Lincoln Building
  39537: 1970,  // Lincoln Building (annex)
  128: 1990,    // Leonardo Hotels
  38929: 1990,  // Leonardo Hotels (annex)
  39188: 2008,  // ETAP Hotel
  84335: 2000,  // Belfast Welcome Centre
  83782: 1960,  // Progressive Building Society
  42267: 1965,  // Donegal House
  45480: 2010,  // Linen Loft
  39414: 1970,  // Willowbrook House
  39415: 1970,  // Woodstock House
  40786: 1970,  // Carnet House
  99953: 1975,  // NCP Tannery
  38731: 1975,  // NCP Tannery
  24: 1975,     // NCP Tannery
  84888: 1975,  // NCP Tannery
  38964: 1975,  // NCP Dublin Road
  281: 1975,    // Car Park No. 1
  740: 1975,    // Value Car Parks
  99960: 2005,  // CCEA
  34: 1985,     // Translink depot
  39377: 2016,  // QUB School of Law
  39533: 2010,  // 22 Gt Victoria St
}

export default BUILDING_YEARS
