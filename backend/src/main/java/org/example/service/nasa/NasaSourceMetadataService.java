package org.example.service.nasa;

import org.example.dto.nasa.NasaDatasetSourceInfo;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Service for NASA dataset source metadata.
 *
 * <p>Provides catalog information about available NASA datasets:
 * source, variables, units, coverage, integration status. This is
 * descriptive metadata, not measurement data.
 */
@Service
public class NasaSourceMetadataService {

    private final NasaDatasetRegistry registry;

    public NasaSourceMetadataService(NasaDatasetRegistry registry) {
        this.registry = registry;
    }

    /**
     * Returns information about all registered NASA data sources.
     *
     * @return list of source info DTOs, never null
     */
    public List<NasaDatasetSourceInfo> listSources() {
        return registry.listDatasetIds().stream()
                .map(id -> registry.getProvider(id)
                        .map(p -> new NasaDatasetSourceInfo(
                                p.datasetId(),
                                p.datasetName(),
                                p.isAvailable()
                        ))
                        .orElse(null))
                .toList();
    }

    /**
     * Returns information about a specific NASA data source.
     *
     * @param datasetId the dataset ID (never null)
     * @return source info, wrapped in Optional
     */
    public NasaDatasetSourceInfo getSource(String datasetId) {
        return registry.getProvider(datasetId)
                .map(p -> new NasaDatasetSourceInfo(
                        p.datasetId(),
                        p.datasetName(),
                        p.isAvailable()
                ))
                .orElse(null);
    }
}
