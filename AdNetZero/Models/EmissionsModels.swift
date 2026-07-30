import Foundation

// MARK: - Macro & Country Summary Models
public struct DatasetSummary: Codable {
    public let country: String
    public let dataSource: String
    public let timeRange: String
    public let totalCsvSources: Int
    public let totalFacilitiesMapped: Int
    public let totalCompaniesMapped: Int
    
    enum CodingKeys: String, CodingKey {
        case country
        case dataSource = "data_source"
        case timeRange = "time_range"
        case totalCsvSources = "total_csv_sources"
        case totalFacilitiesMapped = "total_facilities_mapped"
        case totalCompaniesMapped = "total_companies_mapped"
    }
}

// MARK: - Company Carbon Ledger Model
public struct CompanyProfile: Identifiable, Codable {
    public var id: String { name }
    public let name: String
    public let sectors: [String]
    public let assets: [String]
    public let ownershipPaths: [String]
    public let estCo2eAnnual: Double
    
    public var tier: CarbonTier {
        if estCo2eAnnual > 1_500_000 {
            return .tier1High
        } else if estCo2eAnnual > 500_000 {
            return .tier2Medium
        } else {
            return .tier3Low
        }
    }
    
    enum CodingKeys: String, CodingKey {
        case name
        case sectors
        case assets
        case ownershipPaths = "ownership_paths"
        case estCo2eAnnual = "est_co2e_annual"
    }
}

public enum CarbonTier: String, CaseIterable {
    case tier1High = "Katman 1 (Yüksek)"
    case tier2Medium = "Katman 2 (Orta)"
    case tier3Low = "Katman 3 (Düşük)"
    
    public var systemColorName: String {
        switch self {
        case .tier1High: return "systemRed"
        case .tier2Medium: return "systemYellow"
        case .tier3Low: return "systemGreen"
        }
    }
}

// MARK: - Facility Map Location Model
public struct FacilityLocation: Identifiable, Codable {
    public var id: String { name }
    public let name: String
    public let lat: Double
    public let lon: Double
    public let sector: String
    public let emissionsTonnes: Double
    
    enum CodingKeys: String, CodingKey {
        case name
        case lat
        case lon
        case sector
        case emissionsTonnes = "emissions_tonnes"
    }
}

// MARK: - Full Database Model
public struct AdNetEmissionsDB: Codable {
    public let summary: DatasetSummary
    public let totalYearly: [String: Double]
    public let sectorYearly: [String: [String: [String: Double]]]
    public let companies: [CompanyProfile]
    public let facilities: [FacilityLocation]
    
    enum CodingKeys: String, CodingKey {
        case summary
        case totalYearly = "total_yearly"
        case sectorYearly = "sector_yearly"
        case companies
        case facilities
    }
}

// MARK: - State Management Enums (System Architect HIG Rule)
public enum ViewState<T> {
    case idle
    case loading
    case loaded(T)
    case empty
    case error(String)
}
