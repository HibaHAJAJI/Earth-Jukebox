package org.example.service.nasa;

import org.example.dto.nasa.NasaDatasetSourceInfo;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

/**
 * Unit tests for NasaSourceMetadataService. All dependencies are mocked.
 */
@ExtendWith(MockitoExtension.class)
class NasaSourceMetadataServiceTest {

    @Mock
    private NasaDatasetRegistry registry;

    @InjectMocks
    private NasaSourceMetadataService metadataService;

    @Test
    void listsSources() {
        NasaDatasetProvider provider1 = mock(NasaDatasetProvider.class);
        when(provider1.datasetId()).thenReturn("mur-sst-v4.1");
        when(provider1.datasetName()).thenReturn("MUR Sea Surface Temperature v4.1");
        when(provider1.isAvailable()).thenReturn(true);

        NasaDatasetProvider provider2 = mock(NasaDatasetProvider.class);
        when(provider2.datasetId()).thenReturn("iss-lis-v3");
        when(provider2.datasetName()).thenReturn("ISS Lightning Imaging Sensor v3");
        when(provider2.isAvailable()).thenReturn(false);

        when(registry.listDatasetIds()).thenReturn(List.of("mur-sst-v4.1", "iss-lis-v3"));
        when(registry.getProvider("mur-sst-v4.1")).thenReturn(Optional.of(provider1));
        when(registry.getProvider("iss-lis-v3")).thenReturn(Optional.of(provider2));

        List<NasaDatasetSourceInfo> sources = metadataService.listSources();

        assertThat(sources).hasSize(2);
        assertThat(sources.get(0).datasetId()).isEqualTo("mur-sst-v4.1");
        assertThat(sources.get(0).available()).isTrue();
        assertThat(sources.get(1).datasetId()).isEqualTo("iss-lis-v3");
        assertThat(sources.get(1).available()).isFalse();
    }

    @Test
    void getSourceReturnsNullForUnknownDataset() {
        when(registry.getProvider("unknown")).thenReturn(Optional.empty());

        NasaDatasetSourceInfo info = metadataService.getSource("unknown");

        assertThat(info).isNull();
    }
}
