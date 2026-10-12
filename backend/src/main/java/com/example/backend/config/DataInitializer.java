package com.example.backend.config;

import com.example.backend.model.User;
import com.example.backend.repository.UserRepository;
import com.example.backend.service.EvaluationEngineService;
import com.example.backend.service.ReconciliationEngineService;
import com.example.backend.service.SyntheticDataGeneratorService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements CommandLineRunner {

    private final SyntheticDataGeneratorService generatorService;
    private final ReconciliationEngineService reconService;
    private final EvaluationEngineService evalService;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) throws Exception {
        log.info("🚀 Auto-seeding users and financial benchmark dataset into database...");

        // 1. Seed Default Admin User (Praveen) if not already present
        if (!userRepository.existsByEmail("praveen@finance.com")) {
            User admin = User.builder()
                    .name("Praveen")
                    .email("praveen@finance.com")
                    .password(passwordEncoder.encode("admin123"))
                    .role("ADMIN")
                    .build();
            userRepository.save(admin);
            log.info("👤 Seeded Admin user: praveen@finance.com (password: admin123)");
        }

        // 2. Seed Default Analyst User if not already present
        if (!userRepository.existsByEmail("analyst@finance.com")) {
            User analyst = User.builder()
                    .name("Finance Analyst")
                    .email("analyst@finance.com")
                    .password(passwordEncoder.encode("user123"))
                    .role("USER")
                    .build();
            userRepository.save(analyst);
            log.info("👤 Seeded Analyst user: analyst@finance.com (password: user123)");
        }

        // 3. Seed Multi-Source Financial Dataset (Bank, Payment, Invoice, Settlement, Ground Truth)
        long startTime = System.currentTimeMillis();
        generatorService.generateSyntheticDataset(100);

        // 4. Run Reconciliation Engine & Evaluate Performance
        long reconStartTime = System.currentTimeMillis();
        reconService.runReconciliation();
        long reconDuration = System.currentTimeMillis() - reconStartTime;

        evalService.evaluatePerformance(reconDuration);

        log.info("✅ Database population complete in {} ms. AI Finance Controller Engine Ready with Neon DB!", System.currentTimeMillis() - startTime);
    }
}
