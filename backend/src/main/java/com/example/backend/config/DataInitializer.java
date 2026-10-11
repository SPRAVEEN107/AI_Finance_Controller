package com.example.backend.config;

import com.example.backend.service.EvaluationEngineService;
import com.example.backend.service.ReconciliationEngineService;
import com.example.backend.service.SyntheticDataGeneratorService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements CommandLineRunner {

    private final SyntheticDataGeneratorService generatorService;
    private final ReconciliationEngineService reconService;
    private final EvaluationEngineService evalService;

    @Override
    public void run(String... args) throws Exception {
        log.info("🚀 Auto-seeding synthetic financial benchmark dataset on startup...");

        long startTime = System.currentTimeMillis();
        generatorService.generateSyntheticDataset(100);

        long reconStartTime = System.currentTimeMillis();
        reconService.runReconciliation();
        long reconDuration = System.currentTimeMillis() - reconStartTime;

        evalService.evaluatePerformance(reconDuration);

        log.info("✅ Startup initialization complete in {} ms. AI Finance Controller Engine Ready!", System.currentTimeMillis() - startTime);
    }
}
