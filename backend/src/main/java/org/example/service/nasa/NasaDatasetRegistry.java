package org.example.service.nasa;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Registry of NASA dataset providers.
 *
 * <p>Providers are registered by dataset ID. Lookup is lazy; providers
 * are only invoked when data is actually requested.
 */
@Component
public class NasaDatasetRegistry {

    private final Map<String, NasaDatasetProvider> providers = new ConcurrentHashMap<>();

    public NasaDatasetRegistry(@Autowired(required = false) @Lazy List<NasaDatasetProvider> providers) {
        if (providers != null) {
            for (NasaDatasetProvider provider : providers) {
                this.providers.put(provider.datasetId(), provider);
            }
        }
    }

    /**
     * Registers a provider programmatically.
     *
     * @param provider the provider to register (never null)
     */
    public void register(NasaDatasetProvider provider) {
        providers.put(provider.datasetId(), provider);
    }

    /**
     * Returns the provider for the given dataset ID.
     *
     * @param datasetId the dataset ID (never null)
     * @return the provider, wrapped in Optional
     */
    public Optional<NasaDatasetProvider> getProvider(String datasetId) {
        return Optional.ofNullable(providers.get(datasetId));
    }

    /**
     * Returns all registered dataset IDs.
     *
     * @return list of dataset IDs, never null
     */
    public List<String> listDatasetIds() {
        return List.copyOf(providers.keySet());
    }

    /**
     * Returns whether a provider is registered for the given dataset ID.
     *
     * @param datasetId the dataset ID (never null)
     * @return true if registered, false otherwise
     */
    public boolean isRegistered(String datasetId) {
        return providers.containsKey(datasetId);
    }
}
