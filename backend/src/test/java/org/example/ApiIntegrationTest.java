package org.example;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.ApplicationContext;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import javax.sql.DataSource;
import java.nio.charset.StandardCharsets;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class ApiIntegrationTest {

    private static final String PHENOMENON_ID = "global-temperature-anomaly";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private ApplicationContext applicationContext;

    @Test
    void contextStartsWithoutADataSource() {
        assertThat(applicationContext.getBeanNamesForType(DataSource.class)).isEmpty();
    }

    @Test
    void listsTheTemperaturePhenomenon() throws Exception {
        mockMvc.perform(get("/api/v1/phenomena"))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith("application/json"))
                .andExpect(jsonPath("$.count").value(1))
                .andExpect(jsonPath("$.phenomena[0].id").value(PHENOMENON_ID))
                .andExpect(jsonPath("$.phenomena[0].unit").value("°C"))
                .andExpect(jsonPath("$.phenomena[0].baseline").value("1951-1980"))
                .andExpect(jsonPath("$.phenomena[0].isMock").value(false))
                .andExpect(jsonPath("$.phenomena[0].resolutions[0]").value("monthly"))
                .andExpect(jsonPath("$.phenomena[0].monthly.recordCount").value(1764))
                .andExpect(jsonPath("$.phenomena[0].monthly.missingCount").value(3))
                .andExpect(jsonPath("$.phenomena[0].annual.recordCount").value(146));
    }

    @Test
    void returnsPhenomenonDetail() throws Exception {
        mockMvc.perform(get("/api/v1/phenomena/{id}", PHENOMENON_ID))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(PHENOMENON_ID))
                .andExpect(jsonPath("$.source").value("NASA GISS GISTEMP v4"))
                .andExpect(jsonPath("$.monthly.from").value("1880-01"))
                .andExpect(jsonPath("$.monthly.to").value("2026-12"))
                .andExpect(jsonPath("$.annual.from").value("1880"))
                .andExpect(jsonPath("$.annual.to").value("2025"));
    }

    @Test
    void unknownPhenomenonReturnsNotFoundProblem() throws Exception {
        mockMvc.perform(get("/api/v1/phenomena/{id}", "not-a-real-phenomenon"))
                .andExpect(status().isNotFound())
                .andExpect(content().contentTypeCompatibleWith("application/problem+json"))
                .andExpect(jsonPath("$.title").value("Phenomenon not found"))
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.detail").value("Unknown phenomenon id: not-a-real-phenomenon"));
    }

    @Test
    void returnsFullMonthlySeriesByDefault() throws Exception {
        MvcResult result = mockMvc.perform(get("/api/v1/phenomena/{id}/series", PHENOMENON_ID))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.metadata.resolution").value("monthly"))
                .andExpect(jsonPath("$.metadata.frequency").value("monthly"))
                .andExpect(jsonPath("$.metadata.isMock").value(false))
                .andExpect(jsonPath("$.metadata.recordCount").value(1764))
                .andExpect(jsonPath("$.metadata.numericCount").value(1761))
                .andExpect(jsonPath("$.metadata.missingCount").value(3))
                .andExpect(jsonPath("$.data.length()").value(1764))
                .andExpect(jsonPath("$.data[0].year").value(1880))
                .andExpect(jsonPath("$.data[0].month").value(1))
                .andExpect(jsonPath("$.data[0].anomaly").value(-0.19))
                .andReturn();

        JsonNode body = readBody(result);
        JsonNode last = body.get("data").get(1763);
        assertThat(last.get("year").asInt()).isEqualTo(2026);
        assertThat(last.get("month").asInt()).isEqualTo(12);
        assertThat(last.get("anomaly").isNull()).isTrue();
    }

    @Test
    void filtersMonthlySeriesByInclusiveMonthRange() throws Exception {
        mockMvc.perform(get("/api/v1/phenomena/{id}/series", PHENOMENON_ID)
                        .param("from", "2025-01")
                        .param("to", "2025-03")
                        .param("resolution", "monthly"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.metadata.requestedFrom").value("2025-01"))
                .andExpect(jsonPath("$.metadata.requestedTo").value("2025-03"))
                .andExpect(jsonPath("$.metadata.returnedFrom").value("2025-01"))
                .andExpect(jsonPath("$.metadata.returnedTo").value("2025-03"))
                .andExpect(jsonPath("$.data.length()").value(3))
                .andExpect(jsonPath("$.data[0].year").value(2025))
                .andExpect(jsonPath("$.data[0].month").value(1))
                .andExpect(jsonPath("$.data[0].anomaly").value(1.37))
                .andExpect(jsonPath("$.data[2].month").value(3));
    }

    @Test
    void preservesMissingMonthsAsNull() throws Exception {
        MvcResult result = mockMvc.perform(get("/api/v1/phenomena/{id}/series", PHENOMENON_ID)
                        .param("from", "2026-08")
                        .param("to", "2026-12")
                        .param("resolution", "monthly"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.metadata.missingCount").value(3))
                .andExpect(jsonPath("$.data.length()").value(5))
                .andExpect(jsonPath("$.data[2].anomaly").value(nullValue()))
                .andExpect(jsonPath("$.data[3].anomaly").value(nullValue()))
                .andExpect(jsonPath("$.data[4].anomaly").value(nullValue()))
                .andReturn();

        JsonNode data = readBody(result).get("data");
        assertThat(data.get(2).get("month").asInt()).isEqualTo(10);
        assertThat(data.get(3).get("month").asInt()).isEqualTo(11);
        assertThat(data.get(4).get("month").asInt()).isEqualTo(12);
    }

    @Test
    void returnsTheExistingAnnualDatasetWithoutRenamingFields() throws Exception {
        MvcResult result = mockMvc.perform(get("/api/v1/phenomena/{id}/series", PHENOMENON_ID)
                        .param("resolution", "annual"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.metadata.resolution").value("annual"))
                .andExpect(jsonPath("$.metadata.isMock").value(false))
                .andExpect(jsonPath("$.metadata.recordCount").value(146))
                .andExpect(jsonPath("$.data.length()").value(146))
                .andExpect(jsonPath("$.data[0].year").value(1880))
                .andExpect(jsonPath("$.data[0].temperature").value(-0.17))
                .andExpect(jsonPath("$.data[0].moving_average_10y").value(nullValue()))
                .andExpect(jsonPath("$.data[0].trend").isNumber())
                .andExpect(jsonPath("$.data[145].year").value(2025))
                .andExpect(jsonPath("$.data[145].temperature").value(1.18))
                .andReturn();

        JsonNode data = readBody(result).get("data");
        long nullMovingAverages = 0;
        for (JsonNode record : data) {
            assertThat(record.has("year")).isTrue();
            assertThat(record.has("temperature")).isTrue();
            assertThat(record.has("moving_average_10y")).isTrue();
            assertThat(record.has("trend")).isTrue();
            if (record.get("moving_average_10y").isNull()) {
                nullMovingAverages++;
            }
        }
        assertThat(nullMovingAverages).isEqualTo(9);
    }

    @Test
    void filtersAnnualSeriesByYearRange() throws Exception {
        mockMvc.perform(get("/api/v1/phenomena/{id}/series", PHENOMENON_ID)
                        .param("from", "2000")
                        .param("to", "2005")
                        .param("resolution", "annual"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(6))
                .andExpect(jsonPath("$.data[0].year").value(2000))
                .andExpect(jsonPath("$.data[5].year").value(2005));
    }

    @Test
    void rejectsUnknownResolution() throws Exception {
        mockMvc.perform(get("/api/v1/phenomena/{id}/series", PHENOMENON_ID)
                        .param("resolution", "daily"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.title").value("Invalid query parameter"))
                .andExpect(jsonPath("$.detail").value(
                        "Unsupported resolution 'daily'. Use 'monthly' or 'annual'."
                ));
    }

    @Test
    void rejectsMalformedMonth() throws Exception {
        mockMvc.perform(get("/api/v1/phenomena/{id}/series", PHENOMENON_ID)
                        .param("from", "2025-13")
                        .param("resolution", "monthly"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.title").value("Invalid query parameter"));
    }

    @Test
    void rejectsReversedRange() throws Exception {
        mockMvc.perform(get("/api/v1/phenomena/{id}/series", PHENOMENON_ID)
                        .param("from", "2025-06")
                        .param("to", "2025-01")
                        .param("resolution", "monthly"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value(
                        "The 'from' month must be less than or equal to the 'to' month."
                ));
    }

    @Test
    void returnsSonificationMappingSpecification() throws Exception {
        mockMvc.perform(get("/api/v1/phenomena/{id}/sonification-map", PHENOMENON_ID))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.phenomenonId").value(PHENOMENON_ID))
                .andExpect(jsonPath("$.domain.min").value(-2.0))
                .andExpect(jsonPath("$.domain.max").value(2.0))
                .andExpect(jsonPath("$.domain.scaling").value("fixed-domain"))
                .andExpect(jsonPath("$.domain.minFrequencyHz").value(220.0))
                .andExpect(jsonPath("$.domain.maxFrequencyHz").value(880.0))
                .andExpect(jsonPath("$.domain.baselineFrequencyHz").value(440.0))
                .andExpect(jsonPath("$.domain.curve").value("logarithmic"))
                .andExpect(jsonPath("$.missingValue.behavior").value("silence"))
                .andExpect(jsonPath("$.missingValue.neverSubstituteZero").value(true))
                .andExpect(jsonPath("$.mappings[0].dataField").value("anomaly"))
                .andExpect(jsonPath("$.mappings[0].soundParameter").value("pitch"));
    }

    @Test
    void returnsApiMeta() throws Exception {
        mockMvc.perform(get("/api/v1/meta"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.apiVersion").value("v1"))
                .andExpect(jsonPath("$.datasets.length()").value(2))
                .andExpect(jsonPath("$.datasets[0].frequency").value("monthly"))
                .andExpect(jsonPath("$.datasets[0].recordCount").value(1764))
                .andExpect(jsonPath("$.datasets[0].missingCount").value(3))
                .andExpect(jsonPath("$.datasets[1].frequency").value("annual"))
                .andExpect(jsonPath("$.datasets[1].recordCount").value(146))
                .andExpect(jsonPath("$.endpoints.length()").value(5))
                .andExpect(jsonPath("$.dataPolicy.missingValues").isNotEmpty());
    }

    @Test
    void unknownPathReturnsNotFoundProblem() throws Exception {
        mockMvc.perform(get("/api/v1/does-not-exist"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.title").value("Resource not found"));
    }

    @Test
    void rejectsUnsupportedHttpMethod() throws Exception {
        mockMvc.perform(post("/api/v1/phenomena"))
                .andExpect(status().isMethodNotAllowed())
                .andExpect(jsonPath("$.title").value("Method not allowed"));
    }

    private JsonNode readBody(MvcResult result) throws Exception {
        return objectMapper.readTree(result.getResponse().getContentAsString(StandardCharsets.UTF_8));
    }
}
