package org.example.repository;

import org.example.model.Dataset;
import org.springframework.data.jpa.repository.JpaRepository;


public interface DatasetRepository extends JpaRepository<Dataset, Long> {
}
