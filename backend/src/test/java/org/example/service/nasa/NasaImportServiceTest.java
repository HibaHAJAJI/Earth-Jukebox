package org.example.service.nasa;

import org.example.dto.nasa.EnvironmentalRecordInput;
import org.example.model.nasa.EnvironmentalRecord;
import org.example.repository.nasa.EnvironmentalRecordRepository;
import org.example.repository.nasa.NasaImportBatchRepository;
import org.example.repository.nasa.NasaRawFileMetadataRepository;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Unit tests for NasaImportService. All external dependencies are mocked;
 * no database or network access is required.
 */
class NasaImportServiceTest {

    private final NasaDatasetRegistry registry = mock(NasaDatasetRegistry.class);
    private final EnvironmentalRecordRepository recordRepository = mock(EnvironmentalRecordRepository.class);
    private final NasaImportBatchRepository batchRepository = mock(NasaImportBatchRepository.class);
    private final NasaRawFileMetadataRepository rawFileRepository = mock(NasaRawFileMetadataRepository.class);
    private final NasaImportService importService = new NasaImportService(
        registry, recordRepository, batchRepository, rawFileRepository
    );

    @Test
    void rejectsYearBelow1880() {
        assertThatThrownBy(() -> importService.importDataset("test-dataset", 1879))
                .isInstanceOf(NasaDataException.class)
                .hasMessage("Year must be >= 1880, got: 1879");
    }

    @Test
    void rejectsUnknownDataset() {
        when(registry.getProvider("unknown-dataset")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> importService.importDataset("unknown-dataset", 2023))
                .isInstanceOf(NasaDataException.class)
                .hasMessage("Unknown dataset: unknown-dataset");
    }

    @Test
    void rejectsUnavailableProvider() {
        NasaDatasetProvider provider = mock(NasaDatasetProvider.class);
        when(provider.datasetId()).thenReturn("test-dataset");
        when(provider.isAvailable()).thenReturn(false);
        when(registry.getProvider("test-dataset")).thenReturn(Optional.of(provider));

        assertThatThrownBy(() -> importService.importDataset("test-dataset", 2023))
                .isInstanceOf(NasaDataException.class)
                .hasMessage("Provider not available: test-dataset");
    }

    @Test
    void importsRecordsSuccessfully() {
        NasaDatasetProvider provider = mock(NasaDatasetProvider.class);
        when(provider.datasetId()).thenReturn("test-dataset");
        when(provider.isAvailable()).thenReturn(true);

        EnvironmentalRecordInput input1 = new EnvironmentalRecordInput(
                "test-dataset", 2023, 1, "global", 0.5, "\u00B0C",
                "https://example.com/nasa", "analysed_sst", "MUR-JPL-L4-GLOB-v4.1",
                LocalDateTime.of(2023, 1, 15, 0, 0), 0.0, 0.0, "good"
        );
        EnvironmentalRecordInput input2 = new EnvironmentalRecordInput(
                "test-dataset", 2023, 2, "global", null, "\u00B0C",
                "https://example.com/nasa", "analysed_sst", "MUR-JPL-L4-GLOB-v4.1",
                LocalDateTime.of(2023, 2, 15, 0, 0), 0.0, 0.0, "good"
        );

        when(provider.fetchData(2023)).thenReturn(List.of(input1, input2));
        when(registry.getProvider("test-dataset")).thenReturn(Optional.of(provider));
        when(recordRepository.existsByDatasetNameAndYearAndMonthAndImportBatchId(
                any(), any(), any(), any()
        )).thenReturn(false);
        when(batchRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(recordRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        NasaImportService.ImportResult result = importService.importDataset("test-dataset", 2023);

        assertThat(result.status()).isEqualTo("SUCCESS");
        assertThat(result.recordsImported()).isEqualTo(2);
        assertThat(result.recordsSkipped()).isEqualTo(0);
        assertThat(result.importBatchId()).isNotNull();
        verify(recordRepository, times(2)).save(any(EnvironmentalRecord.class));
    }

    @Test
    void skipsDuplicateRecords() {
        NasaDatasetProvider provider = mock(NasaDatasetProvider.class);
        when(provider.datasetId()).thenReturn("test-dataset");
        when(provider.isAvailable()).thenReturn(true);

        EnvironmentalRecordInput input = new EnvironmentalRecordInput(
                "test-dataset", 2023, 1, "global", 0.5, "\u00B0C",
                "https://example.com/nasa", "analysed_sst", "MUR-JPL-L4-GLOB-v4.1",
                LocalDateTime.of(2023, 1, 15, 0, 0), 0.0, 0.0, "good"
        );

        when(provider.fetchData(2023)).thenReturn(List.of(input));
        when(registry.getProvider("test-dataset")).thenReturn(Optional.of(provider));
        when(recordRepository.existsByDatasetNameAndYearAndMonthAndImportBatchId(
                any(), any(), any(), any()
        )).thenReturn(true);
        when(batchRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        NasaImportService.ImportResult result = importService.importDataset("test-dataset", 2023);

        assertThat(result.recordsImported()).isEqualTo(0);
        assertThat(result.recordsSkipped()).isEqualTo(1);
        verify(recordRepository, never()).save(any(EnvironmentalRecord.class));
    }

    @Test
    void propagatesProviderFailure() {
        NasaDatasetProvider provider = mock(NasaDatasetProvider.class);
        when(provider.datasetId()).thenReturn("test-dataset");
        when(provider.isAvailable()).thenReturn(true);
        when(provider.fetchData(2023)).thenThrow(new RuntimeException("Network error"));
        when(registry.getProvider("test-dataset")).thenReturn(Optional.of(provider));
        when(batchRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        assertThatThrownBy(() -> importService.importDataset("test-dataset", 2023))
                .isInstanceOf(NasaDataException.class)
                .hasMessageContaining("Import failed for dataset test-dataset");
    }
}
