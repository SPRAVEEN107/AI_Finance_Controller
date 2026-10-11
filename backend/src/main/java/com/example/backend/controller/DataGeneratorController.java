package com.example.backend.controller;

import com.example.backend.service.SyntheticDataGeneratorService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/data")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class DataGeneratorController {

    private final SyntheticDataGeneratorService generatorService;

    @PostMapping("/generate")
    public ResponseEntity<?> generateData(@RequestParam(defaultValue = "100") int count) {
        String result = generatorService.generateSyntheticDataset(count);
        return ResponseEntity.ok(Map.of("message", result, "status", "SUCCESS"));
    }
}
