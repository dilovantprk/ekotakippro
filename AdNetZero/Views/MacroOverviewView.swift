import SwiftUI
import Charts

public struct MacroOverviewView: View {
    let db: AdNetEmissionsDB
    
    public var body: some View {
        List {
            // MARK: - Header Card
            Section {
                VStack(alignment: .leading, spacing: 6) {
                    HStack {
                        Image(systemName: "cloud.fill")
                            .font(.title3)
                            .foregroundColor(.green)
                            .accessibilityHidden(true)
                        
                        Text("Türkiye Toplam Karbon Trendi")
                            .font(.headline)
                            .foregroundColor(.primary)
                    }
                    
                    Text("\(formattedTotalEmissions) Mt CO₂e")
                        .font(.title)
                        .fontWeight(.bold)
                        .foregroundColor(.primary)
                        .accessibilityLabel("Türkiye 2025 toplam karbon emisyonu \(formattedTotalEmissions) milyon ton")
                    
                    HStack {
                        Image(systemName: "chart.line.uptrend.xyaxis")
                            .foregroundColor(.green)
                            .font(.caption)
                        Text("Climate TRACE 20 Yıllık Veri")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }
                .padding(.vertical, 4)
            }
            .listRowBackground(Color(uiColor: .secondarySystemGroupedBackground))
            
            // MARK: - Mobile Fluid SwiftChart (Yearly Line Chart)
            Section(header: Text("Yıllık Emisyon Değişimi (2015-2026)").font(.caption).foregroundColor(.secondary)) {
                Chart(yearlyDataPoints, id: \.year) { item in
                    LineMark(
                        x: .value("Yıl", item.year),
                        y: .value("Emisyon (Mt)", item.amount)
                    )
                    .foregroundStyle(Color.green.gradient)
                    .interpolationMethod(.catmullRom)
                    
                    AreaMark(
                        x: .value("Yıl", item.year),
                        y: .value("Emisyon (Mt)", item.amount)
                    )
                    .foregroundStyle(LinearGradient(colors: [.green.opacity(0.25), .clear], startPoint: .top, endPoint: .bottom))
                }
                .chartXAxis {
                    AxisMarks(values: .automatic(desiredCount: 5))
                }
                .frame(height: 190) // Responsive height for mobile screens
                .padding(.vertical, 4)
                .accessibilityLabel("Yıllık emisyon grafiği")
            }
            .listRowBackground(Color(uiColor: .secondarySystemGroupedBackground))
            
            // MARK: - Sector Breakdown Section
            Section(header: Text("Sektörel Dağılım Özeti").font(.caption).foregroundColor(.secondary)) {
                ForEach(sectorSummary, id: \.name) { item in
                    HStack {
                        Image(systemName: item.icon)
                            .foregroundColor(item.color)
                            .frame(width: 32, height: 32)
                            .background(item.color.opacity(0.15))
                            .clipShape(RoundedRectangle(cornerRadius: 8))
                            .accessibilityHidden(true)
                        
                        VStack(alignment: .leading, spacing: 2) {
                            Text(item.name)
                                .font(.subheadline)
                                .fontWeight(.semibold)
                            Text(item.description)
                                .font(.caption2)
                                .foregroundColor(.secondary)
                                .lineLimit(1)
                        }
                        
                        Spacer()
                        
                        Text("\(item.percentage)%")
                            .font(.subheadline)
                            .fontWeight(.bold)
                            .foregroundColor(.primary)
                    }
                    .padding(.vertical, 2)
                    .accessibilityElement(children: .combine)
                    .accessibilityLabel("\(item.name), payı yüzde \(item.percentage)")
                }
            }
            .listRowBackground(Color(uiColor: .secondarySystemGroupedBackground))
        }
        .listStyle(.insetGrouped)
        .navigationTitle("Makro Emisyon Paneli")
    }
    
    private var formattedTotalEmissions: String {
        let lastYearVal = db.totalYearly["2025"] ?? 883000000.0
        return String(format: "%.1f", lastYearVal / 1_000_000.0)
    }
    
    private var yearlyDataPoints: [YearlyPoint] {
        return db.totalYearly.sorted(by: { $0.key < $1.key }).map {
            YearlyPoint(year: $0.key, amount: $0.value / 1_000_000.0)
        }
    }
    
    private var sectorSummary: [SectorSummaryItem] {
        return [
            SectorSummaryItem(name: "Enerji & Üretim", description: "Elektrik ve çimento/çelik imalatı", percentage: 48, icon: "bolt.fill", color: .yellow),
            SectorSummaryItem(name: "Ulaştırma & Lojistik", description: "Kara ve hava yolu nakliyesi", percentage: 24, icon: "airplane", color: .blue),
            SectorSummaryItem(name: "İmalat & Tekstil", description: "Fabrika operasyonları", percentage: 18, icon: "building.2.fill", color: .green),
            SectorSummaryItem(name: "Binalar & Atık", description: "Ofisler ve kentsel alanlar", percentage: 10, icon: "trash.fill", color: .purple)
        ]
    }
}
