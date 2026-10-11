package com.example.backend.controller;

import com.example.backend.dto.ChatRequest;
import com.example.backend.dto.ChatResponse;
import com.example.backend.service.AIService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class AIController {

    private final AIService aiService;

    @PostMapping("/chat")
    public ResponseEntity<ChatResponse> chat(@RequestBody ChatRequest request) {
        String query = request != null && request.getQuery() != null ? request.getQuery() : "tell me about this project";
        String aiResponse = aiService.generateChatResponse(query);

        return ResponseEntity.ok(ChatResponse.builder()
                .response(aiResponse)
                .timestamp(System.currentTimeMillis())
                .build());
    }
}
