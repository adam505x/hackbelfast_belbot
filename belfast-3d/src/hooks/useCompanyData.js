import { useState, useEffect, useMemo } from 'react'

// Top companies with establishment year in Belfast and building index
// est = year established/opened in Belfast. Sources: news articles, company websites, Wikipedia
const COMPANIES = [
  { name: 'PwC', sector: 'Professional Services', employees: '2500+', est: 1870, idx: 39073 },
  { name: 'Deloitte', sector: 'Professional Services', employees: '1500+', est: 1890, idx: 40540 },
  { name: 'EY', sector: 'Professional Services', employees: '1200+', est: 1920, idx: 40544 },
  { name: 'KPMG', sector: 'Professional Services', employees: '800+', est: 1950, idx: 100159 },
  { name: 'Kainos', sector: 'Technology', employees: '2800+', est: 1986, idx: 465 },
  { name: 'Allstate NI', sector: 'Technology', employees: '2400+', est: 1999, idx: 45925 },
  { name: 'Concentrix', sector: 'Technology', employees: '3500+', est: 2014, idx: 39217 },
  { name: 'Citigroup', sector: 'Finance', employees: '3000+', est: 2006, idx: 100809 }, // City Quays
  { name: 'FinTrU', sector: 'FinTech', employees: '1500+', est: 2013, idx: 38771 },
  { name: 'Danske Bank', sector: 'Banking', employees: '1800+', est: 1824, idx: 39074 }, // as Northern Bank
  { name: 'Spirit AeroSystems', sector: 'Aerospace', employees: '3500+', est: 1989, idx: 99991 }, // as Bombardier/Shorts
  { name: 'Harland & Wolff', sector: 'Shipbuilding', employees: '500+', est: 1861, idx: 40784 },
  { name: 'Titanic Belfast', sector: 'Tourism', employees: '300+', est: 2012, idx: 100457 },
  { name: 'Translink', sector: 'Transport', employees: '4000+', est: 1996, idx: 34 },
  { name: 'Belfast City Airport', sector: 'Transport', employees: '500+', est: 1983, idx: 100076 },
  { name: 'Belfast Harbour', sector: 'Port', employees: '800+', est: 1847, idx: 100154 },
  { name: "Queen's University", sector: 'Education', employees: '4000+', est: 1845, idx: 2 },
  { name: 'Belfast Health Trust', sector: 'Healthcare', employees: '22000+', est: 1797, idx: 121 }, // RVH
  { name: 'Mater Hospital', sector: 'Healthcare', employees: '2000+', est: 1883, idx: 84936 },
  { name: 'SSE Arena', sector: 'Entertainment', employees: '200+', est: 2000, idx: 100006 },
  { name: 'Waterfront Hall', sector: 'Events', employees: '150+', est: 1997, idx: 42910 },
  { name: 'Victoria Square', sector: 'Retail', employees: '2000+', est: 2008, idx: 43075 },
  { name: 'CastleCourt', sector: 'Retail', employees: '1500+', est: 1990, idx: 99947 },
  { name: 'Invest NI', sector: 'Government', employees: '600+', est: 2002, idx: 39178 },
  { name: 'Belfast City Hall', sector: 'Government', employees: '2500+', est: 1906, idx: 40538 },
  { name: 'Obel Tower', sector: 'Mixed Use', employees: '500+', est: 2011, idx: 100129 },
  { name: 'BT Riverside Tower', sector: 'Telecoms', employees: '2000+', est: 2009, idx: 42913 },
  { name: 'City Quays 2', sector: 'Office', employees: '2000+', est: 2018, idx: 100976 },
  { name: 'Linen Hall Library', sector: 'Culture', employees: '50+', est: 1788, idx: 42925 },
  { name: 'Rapid7', sector: 'Cybersecurity', employees: '400+', est: 2014, idx: 100976 },
  { name: 'Baker McKenzie', sector: 'Legal', employees: '300+', est: 2016, idx: 39074 },
  { name: 'Microsoft', sector: 'Technology', employees: '500+', est: 2024, idx: 99974 }, // T13 building, Titanic Quarter
]

export function useCompanyData(period) {
  const [buildings, setBuildings] = useState(null)

  useEffect(() => {
    fetch('/belfast-buildings.json')
      .then(r => r.json())
      .then(setBuildings)
      .catch(() => {})
  }, [])

  const data = useMemo(() => {
    if (!buildings) return null
    const year = parseInt(period) || 2025

    const features = COMPANIES
      .filter(c => c.idx < buildings.length && c.est <= year)
      .map(c => {
        const b = buildings[c.idx]
        const props = b[0]
        const coords = b[1]
        return {
          type: 'Feature',
          properties: {
            name: c.name,
            sector: c.sector,
            employees: c.employees,
            established: c.est,
            building_name: props.n || '',
            height: props.h || 12,
          },
          geometry: { type: 'Polygon', coordinates: [coords] },
        }
      })

    return { type: 'FeatureCollection', features }
  }, [buildings, period])

  return data
}
