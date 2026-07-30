import SwiftUI
import MapKit

public struct EmissionMapView: View {
    let db: AdNetEmissionsDB
    @State private var selectedSector = "Tümü"
    @State private var region = MKCoordinateRegion(
        center: CLLocationCoordinate2D(latitude: 39.0, longitude: 35.2),
        span: MKCoordinateSpan(latitudeDelta: 7.5, longitudeDelta: 10.0)
    )
    
    let sectors = ["Tümü", "Enerji", "İmalat & Sanayi", "Ulaştırma & Lojistik", "Maden & Hammadde"]
    
    public var body: some View {
        VStack(spacing: 0) {
            // Sleek Apple Filter Chips
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 6) {
                    ForEach(sectors, id: \.self) { sector in
                        Button(action: { selectedSector = sector }) {
                            Text(sector)
                                .font(.caption)
                                .fontWeight(.medium)
                                .padding(.horizontal, 10)
                                .padding(.vertical, 6)
                                .background(selectedSector == sector ? Color(uiColor: .systemGray3) : Color(uiColor: .tertiarySystemGroupedBackground))
                                .foregroundColor(selectedSector == sector ? .white : .secondary)
                                .cornerRadius(8)
                        }
                    }
                }
                .padding(.horizontal)
                .padding(.vertical, 8)
            }
            .background(Color(uiColor: .secondarySystemGroupedBackground))
            
            // Map View with Facility Pins
            Map(coordinateRegion: $region, annotationItems: filteredFacilities) { fac in
                MapAnnotation(coordinate: CLLocationCoordinate2D(latitude: fac.lat, longitude: fac.lon)) {
                    VStack(spacing: 0) {
                        Image(systemName: "factory.fill")
                            .font(.caption2)
                            .padding(6)
                            .background(sectorColor(fac.sector))
                            .foregroundColor(.white)
                            .clipShape(Circle())
                            .shadow(radius: 2)
                        
                        Text(fac.name)
                            .font(.system(size: 8, weight: .bold))
                            .padding(2)
                            .background(Color.black.opacity(0.7))
                            .foregroundColor(.white)
                            .cornerRadius(3)
                    }
                }
            }
        }
        .navigationTitle("Tesis Haritası")
    }
    
    private var filteredFacilities: [FacilityEmissions] {
        Array(db.facilities.filter { fac in
            selectedSector == "Tümü" || fac.sector.localizedCaseInsensitiveContains(selectedSector)
        }.prefix(120))
    }
    
    private func sectorColor(_ sector: String) -> Color {
        if sector.contains("Enerji") { return .orange }
        if sector.contains("İmalat") { return .blue }
        if sector.contains("Ulaştırma") { return .teal }
        if sector.contains("Maden") { return .purple }
        return .green
    }
}
