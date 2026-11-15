package org.example.service;

import org.example.data.MonthlyFileMetadata;
import org.example.data.ResourcePhenomenonDataRepository;
import org.example.dto.SonificationMapDTO;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class SonificationMapService {

    private final ResourcePhenomenonDataRepository repository;
    private final PhenomenonCatalogService catalogService;

    public SonificationMapService(
            ResourcePhenomenonDataRepository repository,
            PhenomenonCatalogService catalogService
    ) {
        this.repository = repository;
        this.catalogService = catalogService;
    }

    public SonificationMapDTO getMap(String phenomenonId) {
        catalogService.requirePhenomenon(phenomenonId);
        MonthlyFileMetadata metadata = repository.monthlyDataset().metadata();

        return new SonificationMapDTO(
                PhenomenonCatalogService.TEMPERATURE_PHENOMENON_ID,
                PhenomenonCatalogService.API_VERSION,
                "1.0.0",
                "specification-ready",
                "Specification for a deterministic, client-side Web Audio engine. "
                        + "The backend does not synthesize or stream audio.",
                new SonificationMapDTO.Domain(
                        -2.0,
                        2.0,
                        metadata.unit(),
                        "fixed-domain",
                        220.0,
                        880.0,
                        440.0,
                        "logarithmic"
                ),
                List.of(
                        new SonificationMapDTO.ParameterMapping(
                                "anomaly",
                                "pitch",
                                "higher anomaly = higher pitch",
                                "Map the monthly anomaly from -2.0 to +2.0 degrees Celsius "
                                        + "onto 220 Hz (A3) to 880 Hz (A5) with a logarithmic "
                                        + "frequency curve, so 0 degrees Celsius is 440 Hz (A4). "
                                        + "The domain is fixed and values outside it are clamped, "
                                        + "never rescaled per view."
                        ),
                        new SonificationMapDTO.ParameterMapping(
                                "anomaly",
                                "brightness",
                                "higher anomaly = brighter timbre",
                                "Use a low-pass/timbre change so warmer months sound brighter "
                                        + "without relying on pitch alone."
                        ),
                        new SonificationMapDTO.ParameterMapping(
                                "year",
                                "accent",
                                "year boundary = soft accent",
                                "A subtle accent at each year boundary helps listeners track "
                                        + "time without spoken narration."
                        ),
                        new SonificationMapDTO.ParameterMapping(
                                "moving_average_10y",
                                "sustained pad",
                                "higher moving average = higher pad",
                                "Optional low-volume sustained layer derived from the existing "
                                        + "annual dataset. Null moving averages remain silent."
                        )
                ),
                new SonificationMapDTO.MissingValueHandling(
                        "silence",
                        true,
                        true,
                        "This month has no reported value. The gap is preserved and is not treated as zero."
                ),
                new SonificationMapDTO.Tempo(
                        620,
                        List.of(0.5, 1.0, 2.0, 4.0)
                ),
                "Audio synthesis is intentionally not implemented in the Spring Boot backend. "
                        + "The frontend Web Audio engine must consume this mapping contract and "
                        + "must not claim playback before the AudioContext has started.",
                List.of(
                        "The mapping is deterministic: the same data and settings produce the same sound.",
                        "Meaning must not depend only on stereo position or subtle timbre; mono-safe output is required.",
                        "Missing values must never be converted to zero or to an estimated note.",
                        "The scientific chart, text summary and data table remain the primary references."
                )
        );
    }
}
