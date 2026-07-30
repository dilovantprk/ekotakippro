import SwiftUI

public struct SimulatorView: View {
    @State private var companyTypeIndex = 0
    @State private var employeeCount: Double = 150
    @State private var shootCount: Double = 12
    @State private var mediaBudgetMillions: Double = 25
    @State private var eventCount: Double = 8
    
    let companyTypes = ["Reklamveren Marka", "Reklam / Medya Ajansı", "Medya Yayıncısı", "Prodüksiyon Evi"]
    
    public var body: some View {
        Form {
            Section(header: Text("Şirket & Kampanya Parametreleri").font(.caption).foregroundColor(.secondary)) {
                Picker("Şirket Türü", selection: $companyTypeIndex) {
                    ForEach(0..<companyTypes.count, id: \.self) { idx in
                        Text(companyTypes[idx]).tag(idx)
                    }
                }
                .pickerStyle(.menu)
                
                VStack(alignment: .leading, spacing: 6) {
                    HStack {
                        Label("Çalışan Sayısı (Action 1)", systemImage: "person.3.fill")
                            .font(.subheadline)
                        Spacer()
                        Text("\(Int(employeeCount)) Kişi")
                            .font(.headline)
                            .foregroundColor(.green)
                    }
                    Slider(value: $employeeCount, in: 10...1000, step: 10)
                        .tint(.green)
                }
                .padding(.vertical, 4)
                
                VStack(alignment: .leading, spacing: 6) {
                    HStack {
                        Label("Reklam Çekim Sayısı (Action 2)", systemImage: "video.fill")
                            .font(.subheadline)
                        Spacer()
                        Text("\(Int(shootCount)) Çekim/Yıl")
                            .font(.headline)
                            .foregroundColor(.green)
                    }
                    Stepper("", value: $shootCount, in: 0...100)
                }
                .padding(.vertical, 4)
                
                VStack(alignment: .leading, spacing: 6) {
                    HStack {
                        Label("Medya Bütçesi (Action 3)", systemImage: "rectangle.3.group.fill")
                            .font(.subheadline)
                        Spacer()
                        Text("₺\(Int(mediaBudgetMillions))M / Yıl")
                            .font(.headline)
                            .foregroundColor(.green)
                    }
                    Slider(value: $mediaBudgetMillions, in: 1...200, step: 1)
                        .tint(.green)
                }
                .padding(.vertical, 4)
                
                VStack(alignment: .leading, spacing: 6) {
                    HStack {
                        Label("Etkinlik Sayısı (Action 4)", systemImage: "calendar.circle.fill")
                            .font(.subheadline)
                        Spacer()
                        Text("\(Int(eventCount)) Etkinlik")
                            .font(.headline)
                            .foregroundColor(.green)
                    }
                    Stepper("", value: $eventCount, in: 0...50)
                }
                .padding(.vertical, 4)
            }
            
            // MARK: - Simulation Results Section
            Section(header: Text("AdNet Zero 2030 Simülasyon Sonucu").font(.caption).foregroundColor(.secondary)) {
                HStack {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Mevcut Emisyon")
                            .font(.caption)
                            .foregroundColor(.secondary)
                        Text("\(calculatedTotalEmissions) Ton CO₂e")
                            .font(.title2)
                            .fontWeight(.bold)
                            .foregroundColor(.red)
                    }
                    
                    Spacer()
                    
                    Image(systemName: "arrow.right")
                        .foregroundColor(.secondary)
                    
                    Spacer()
                    
                    VStack(alignment: .trailing, spacing: 4) {
                        Text("2030 Net-Sıfır Hedefi")
                            .font(.caption)
                            .foregroundColor(.secondary)
                        Text("\(targetEmissions2030) Ton CO₂e")
                            .font(.title2)
                            .fontWeight(.bold)
                            .foregroundColor(.green)
                    }
                }
                .padding(.vertical, 8)
                
                VStack(alignment: .leading, spacing: 8) {
                    Text("AdNet Türkiye Eylem Önerileri")
                        .font(.headline)
                        .padding(.top, 4)
                    
                    ActionRow(title: "Ofis Enerjisi (Action 1)", detail: "I-REC yeşil elektrik sözleşmesi ile ~\(Int(employeeCount * 0.7)) ton tasarruf.")
                    ActionRow(title: "Prodüksiyon (Action 2)", detail: "Dizel jeneratör yerine batarya seti ile %60 karbon düşüşü.")
                    ActionRow(title: "Medya Dağıtımı (Action 3)", detail: "Karbon-nötr pazar yeri gösterimleri ile %45 emisyon tasarrufu.")
                }
            }
        }
        .navigationTitle("5-Adım Simülatör")
    }
    
    private var calculatedTotalEmissions: Int {
        let ops = employeeCount * 1.8
        let shoots = shootCount * 15.5
        let media = mediaBudgetMillions * 8.2
        let events = eventCount * 6.0
        return Int(ops + shoots + media + events)
    }
    
    private var targetEmissions2030: Int {
        return Int(Double(calculatedTotalEmissions) * 0.45)
    }
}

struct ActionRow: View {
    let title: String
    let detail: String
    
    var body: some View {
        HStack(alignment: .top, spacing: 8) {
            Image(systemName: "checkmark.circle.fill")
                .foregroundColor(.green)
                .padding(.top, 2)
            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.subheadline)
                    .fontWeight(.semibold)
                Text(detail)
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
        }
    }
}
