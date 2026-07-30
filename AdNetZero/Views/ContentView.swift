import SwiftUI

public struct ContentView: View {
    @StateObject private var dataService = EmissionsDataService()
    @State private var selectedTab = 0
    
    public init() {}

    public var body: some View {
        Group {
            switch dataService.state {
            case .loading:
                ProgressView("Climate TRACE Verileri Yükleniyor...")
                    .progressViewStyle(CircularProgressViewStyle())
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .background(Color(uiColor: .systemGroupedBackground))
                    .accessibilityLabel("Veri Yükleniyor")

            case .empty:
                VStack(spacing: 12) {
                    Image(systemName: "exclamationmark.triangle.fill")
                        .font(.system(size: 40))
                        .foregroundColor(.orange)
                    Text("Veri Bulunamadı")
                        .font(.headline)
                    Button("Tekrar Deneyin") {
                        Task { await dataService.loadEmissionsData() }
                    }
                    .buttonStyle(.borderedProminent)
                }

            case .error(let message):
                VStack(spacing: 12) {
                    Image(systemName: "xmark.octagon.fill")
                        .font(.system(size: 40))
                        .foregroundColor(.red)
                    Text("Hata Oluştu")
                        .font(.headline)
                    Text(message)
                        .font(.caption)
                        .foregroundColor(.secondary)
                    Button("Tekrar Deneyin") {
                        Task { await dataService.loadEmissionsData() }
                    }
                    .buttonStyle(.borderedProminent)
                }

            case .loaded(let db):
                TabView(selection: $selectedTab) {
                    NavigationView {
                        MacroOverviewView(db: db)
                    }
                    .tabItem {
                        Label("Makro", systemImage: "chart.line.uptrend.xyaxis")
                    }
                    .tag(0)

                    NavigationView {
                        CompanyLedgerView(db: db)
                    }
                    .tabItem {
                        Label("Defter", systemImage: "building.2.fill")
                    }
                    .tag(1)

                    NavigationView {
                        SimulatorView()
                    }
                    .tabItem {
                        Label("Simülatör", systemImage: "slider.horizontal.3")
                    }
                    .tag(2)

                    NavigationView {
                        EmissionMapView(db: db)
                    }
                    .tabItem {
                        Label("Harita", systemImage: "map.fill")
                    }
                    .tag(3)
                }
                .accentColor(.green)
            }
        }
        .task {
            await dataService.loadEmissionsData()
        }
    }
}
