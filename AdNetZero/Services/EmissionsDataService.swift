import Foundation
import Combine

@MainActor
public class EmissionsDataService: ObservableObject {
    @Published public var state: ViewState<AdNetEmissionsDB> = .idle
    @Published public var searchText: String = ""
    @Published public var selectedSectorFilter: String = "ALL"
    @Published public var selectedCompany: CompanyProfile? = nil
    
    public init() {
        fetchEmissionsData()
    }
    
    public func fetchEmissionsData() {
        self.state = .loading
        
        guard let url = Bundle.main.url(forResource: "adnet_emissions_db", withExtension: "json") ?? URL(string: "http://localhost:8765/data/adnet_emissions_db.json") else {
            self.state = .error("Veritabanı dosyası bulunamadı.")
            return
        }
        
        Task {
            do {
                let data = try Data(contentsOf: url)
                let decoder = JSONDecoder()
                let db = try decoder.decode(AdNetEmissionsDB.self, from: data)
                
                if db.companies.isEmpty {
                    self.state = .empty
                } else {
                    self.state = .loaded(db)
                }
            } catch {
                self.state = .error("Veri çözümlenemedi: \(error.localizedDescription)")
            }
        }
    }
    
    public func filteredCompanies(from companies: [CompanyProfile]) -> [CompanyProfile] {
        return companies.filter { company in
            let matchesSearch = searchText.isEmpty || company.name.localizedCaseInsensitiveContains(searchText)
            let matchesSector = selectedSectorFilter == "ALL" || company.sectors.contains { $0.localizedCaseInsensitiveContains(selectedSectorFilter) }
            return matchesSearch && matchesSector
        }
    }
}
