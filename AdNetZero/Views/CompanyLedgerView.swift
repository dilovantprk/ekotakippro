import SwiftUI

public struct CompanyLedgerView: View {
    let db: AdNetEmissionsDB
    @State private var searchText = ""
    @State private var selectedSector = "Tümü"
    @State private var selectedCompany: CompanyEmissions?
    
    let sectors = ["Tümü", "Enerji", "İmalat & Sanayi", "Ulaştırma & Lojistik", "Maden & Hammadde"]
    
    public var body: some View {
        VStack(spacing: 0) {
            // Search Bar & Filter
            VStack(spacing: 8) {
                HStack {
                    Image(systemName: "magnifyingglass")
                        .foregroundColor(.secondary)
                    TextField("Şirket ara...", text: $searchText)
                        .textFieldStyle(.plain)
                }
                .padding(8)
                .background(Color(uiColor: .tertiarySystemGroupedBackground))
                .cornerRadius(10)
                
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 6) {
                        ForEach(sectors, id: \.self) { sector in
                            Button(action: { selectedSector = sector }) {
                                Text(sector)
                                    .font(.caption)
                                    .fontWeight(.medium)
                                    .padding(.horizontal, 10)
                                    .padding(.vertical, 6)
                                    .background(selectedSector == sector ? Color.green : Color(uiColor: .tertiarySystemGroupedBackground))
                                    .foregroundColor(selectedSector == sector ? .black : .primary)
                                    .cornerRadius(8)
                            }
                        }
                    }
                }
            }
            .padding(.horizontal)
            .padding(.vertical, 8)
            .background(Color(uiColor: .secondarySystemGroupedBackground))
            
            // Clean Minimal iOS List
            List(filteredCompanies) { company in
                Button(action: { selectedCompany = company }) {
                    HStack {
                        VStack(alignment: .leading, spacing: 2) {
                            Text(company.name)
                                .font(.subheadline)
                                .fontWeight(.semibold)
                                .foregroundColor(.primary)
                            
                            Text("\(company.sectors.joined(separator: ", ")) • \(company.assets.count) Tesis")
                                .font(.caption2)
                                .foregroundColor(.secondary)
                        }
                        
                        Spacer()
                        
                        Text(formattedEmissions(company.estCo2eAnnual))
                            .font(.footnote)
                            .fontWeight(.bold)
                            .foregroundColor(.green)
                        
                        Image(systemName: "chevron.right")
                            .font(.caption2)
                            .foregroundColor(.secondary)
                            .padding(.leading, 4)
                    }
                    .padding(.vertical, 4)
                }
            }
            .listStyle(.insetGrouped)
        }
        .navigationTitle("Karbon Defteri")
        .sheet(item: $selectedCompany) { company in
            CompanyDetailSheet(company: company)
        }
    }
    
    private var filteredCompanies: [CompanyEmissions] {
        db.companies.filter { company in
            let matchesSearch = searchText.isEmpty || company.name.localizedCaseInsensitiveContains(searchText)
            let matchesSector = selectedSector == "Tümü" || company.sectors.contains(where: { $0.localizedCaseInsensitiveContains(selectedSector) })
            return matchesSearch && matchesSector
        }
    }
    
    private func formattedEmissions(_ amount: Double) -> String {
        if amount >= 1_000_000 {
            return String(format: "%.2f Mt CO₂e", amount / 1_000_000.0)
        }
        return "\(Int(amount).formatted()) Ton"
    }
}

struct CompanyDetailSheet: View {
    let company: CompanyEmissions
    @Environment(\.dismiss) var dismiss
    
    var body: some View {
        NavigationView {
            List {
                Section(header: Text("Karbon Katmanı")) {
                    HStack {
                        Text(tierText(for: company.estCo2eAnnual))
                            .font(.subheadline)
                            .fontWeight(.bold)
                            .foregroundColor(tierColor(for: company.estCo2eAnnual))
                        Spacer()
                        Text(tierDescription(for: company.estCo2eAnnual))
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }
                
                Section(header: Text("Şirket Özeti")) {
                    LabeledContent("Şirket Adı", value: company.name)
                    LabeledContent("Sektörler", value: company.sectors.joined(separator: ", "))
                    LabeledContent("Haritalanan Tesis", value: "\(company.assets.count) Adet")
                    LabeledContent("Yıllık Emisyon", value: "\(Int(company.estCo2eAnnual).formatted()) Ton CO₂e")
                }
                
                Section(header: Text("Tesisler ve Sahiplik Yapısı")) {
                    ForEach(company.assets, id: \.self) { asset in
                        Label(asset, systemImage: "factory.fill")
                            .font(.subheadline)
                    }
                }
            }
            .listStyle(.insetGrouped)
            .navigationTitle(company.name)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Kapat") { dismiss() }
                }
            }
        }
    }
    
    private func tierText(for amount: Double) -> String {
        if amount > 1_500_000 { return "Katman 1" }
        if amount > 500_000 { return "Katman 2" }
        return "Katman 3"
    }
    
    private func tierDescription(for amount: Double) -> String {
        if amount > 1_500_000 { return "Yüksek Emisyonlu Holding" }
        if amount > 500_000 { return "Orta Emisyonlu Holding" }
        return "Düşük Emisyonlu İşletme"
    }
    
    private func tierColor(for amount: Double) -> Color {
        if amount > 1_500_000 { return .red }
        if amount > 500_000 { return .orange }
        return .green
    }
}
