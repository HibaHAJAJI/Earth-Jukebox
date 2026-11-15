package org.example.controller.v1;

import org.example.dto.ExplainRequest;
import org.example.dto.ExplainResponse;
import org.example.service.ai.ExplanationService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;

@SpringBootTest
@AutoConfigureMockMvc
class ExplanationControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private ExplanationService explanationService;

    @Test
    void passesFrenchLanguageToService() throws Exception {
        when(explanationService.explain(any(Integer.class), any(Integer.class), any(String.class)))
                .thenReturn(new ExplainResponse(
                        "Explication en français",
                        "1 enregistrement(s) récupéré(s)",
                        "NASA GISS GISTEMP v4",
                        "2023",
                        "°C",
                        "fr",
                        ExplainResponse.ValidationStatus.DATA_VALIDATED,
                        "Aucune limitation"
                ));

        mockMvc.perform(post("/api/v1/ai/explain")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new ExplainRequest(2023, 1, "fr"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.language").value("fr"))
                .andExpect(jsonPath("$.explanation").value("Explication en français"));
    }

    @Test
    void passesArabicLanguageToService() throws Exception {
        when(explanationService.explain(any(Integer.class), any(Integer.class), any(String.class)))
                .thenReturn(new ExplainResponse(
                        "تفسير درجة الحرارة",
                        "سجل واحد تم استرداده",
                        "NASA GISS GISTEMP v4",
                        "2023",
                        "°C",
                        "ar",
                        ExplainResponse.ValidationStatus.DATA_VALIDATED,
                        "لا توجد قيود"
                ));

        mockMvc.perform(post("/api/v1/ai/explain")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new ExplainRequest(2023, 1, "ar"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.language").value("ar"))
                .andExpect(jsonPath("$.explanation").value("تفسير درجة الحرارة"));
    }

    @Test
    void passesEnglishLanguageToService() throws Exception {
        when(explanationService.explain(any(Integer.class), any(Integer.class), any(String.class)))
                .thenReturn(new ExplainResponse(
                        "Test explanation",
                        "1 record(s) retrieved",
                        "NASA GISS GISTEMP v4",
                        "2023",
                        "°C",
                        "en",
                        ExplainResponse.ValidationStatus.DATA_VALIDATED,
                        "No limitations"
                ));

        mockMvc.perform(post("/api/v1/ai/explain")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new ExplainRequest(2023, 1, "en"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.language").value("en"))
                .andExpect(jsonPath("$.explanation").value("Test explanation"));
    }

    @Test
    void passesUnsupportedLanguageThrough() throws Exception {
        when(explanationService.explain(any(Integer.class), any(Integer.class), any(String.class)))
                .thenReturn(new ExplainResponse(
                        "Test explanation",
                        "1 record(s) retrieved",
                        "NASA GISS GISTEMP v4",
                        "2023",
                        "°C",
                        "xx",
                        ExplainResponse.ValidationStatus.DATA_VALIDATED,
                        "No limitations"
                ));

        mockMvc.perform(post("/api/v1/ai/explain")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new ExplainRequest(2023, 1, "xx"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.language").value("xx"));
    }
}