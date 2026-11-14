package org.example.dto;

import java.util.List;

public record ApiMetaDTO(
        String application,
        String apiVersion,
        String backendVersion,
        String serverTime,
        String apiDocumentation,
        List<DatasetMeta> datasets,
        List<EndpointInfo> endpoints,
        DataPolicy dataPolicy
) {

    public record DatasetMeta(
            String id,
            String frequency,
            String source,
            String unit,
            String baseline,
            String coverage,
            int recordCount,
            int missingCount,
            String dataVersion,
            boolean isMock
    ) {
    }

    public record EndpointInfo(
            String method,
            String path,
            String description
    ) {
    }

    public record DataPolicy(
            String missingValues,
            String annualAggregation,
            String monthlySource,
            String defaultMode,
            String sonification
    ) {
    }
}
