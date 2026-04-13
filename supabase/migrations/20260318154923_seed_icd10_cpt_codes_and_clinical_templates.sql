/*
  # Seed ICD-10 Codes, CPT Procedure Codes, and Clinical Templates

  1. New Data
    - `icd10_codes`: 50 commonly used ICD-10-CA diagnosis codes for Canadian primary care
    - `procedure_codes`: 40 commonly used CPT/CCI procedure codes
    - `clinical_templates`: 3 system templates (General SOAP, Cardiology Consultation, Pediatric Well-Child)

  2. Important Notes
    - All codes flagged as commonly_used = true for quick access
    - Templates marked as is_system_template = true
    - ICD-10 codes version set to '2024' (ICD-10-CA)
    - CPT codes include typical fee estimates in CAD
    - Uses INSERT ... ON CONFLICT DO NOTHING to be idempotent
*/

INSERT INTO icd10_codes (code, description, category, subcategory, commonly_used, is_active) VALUES
  ('J00', 'Acute nasopharyngitis (common cold)', 'Respiratory', 'Upper respiratory', true, true),
  ('J06.9', 'Acute upper respiratory infection, unspecified', 'Respiratory', 'Upper respiratory', true, true),
  ('J20.9', 'Acute bronchitis, unspecified', 'Respiratory', 'Lower respiratory', true, true),
  ('J45.9', 'Asthma, unspecified', 'Respiratory', 'Chronic respiratory', true, true),
  ('J18.9', 'Pneumonia, unspecified organism', 'Respiratory', 'Lower respiratory', true, true),
  ('I10', 'Essential (primary) hypertension', 'Circulatory', 'Hypertension', true, true),
  ('I25.10', 'Atherosclerotic heart disease', 'Circulatory', 'Ischemic heart', true, true),
  ('I48.91', 'Unspecified atrial fibrillation', 'Circulatory', 'Arrhythmia', true, true),
  ('I50.9', 'Heart failure, unspecified', 'Circulatory', 'Heart failure', true, true),
  ('E11.9', 'Type 2 diabetes mellitus without complications', 'Endocrine', 'Diabetes', true, true),
  ('E11.65', 'Type 2 diabetes with hyperglycemia', 'Endocrine', 'Diabetes', true, true),
  ('E03.9', 'Hypothyroidism, unspecified', 'Endocrine', 'Thyroid', true, true),
  ('E78.5', 'Hyperlipidemia, unspecified', 'Endocrine', 'Metabolic', true, true),
  ('E66.01', 'Morbid obesity due to excess calories', 'Endocrine', 'Metabolic', true, true),
  ('M25.50', 'Pain in unspecified joint', 'Musculoskeletal', 'Joint', true, true),
  ('M54.5', 'Low back pain', 'Musculoskeletal', 'Spine', true, true),
  ('M79.3', 'Panniculitis, unspecified', 'Musculoskeletal', 'Soft tissue', true, true),
  ('M17.9', 'Osteoarthritis of knee, unspecified', 'Musculoskeletal', 'Joint', true, true),
  ('M81.0', 'Age-related osteoporosis without fracture', 'Musculoskeletal', 'Bone', true, true),
  ('R51', 'Headache', 'Symptoms', 'Neurological', true, true),
  ('R50.9', 'Fever, unspecified', 'Symptoms', 'General', true, true),
  ('R10.9', 'Unspecified abdominal pain', 'Symptoms', 'Gastrointestinal', true, true),
  ('R05', 'Cough', 'Symptoms', 'Respiratory', true, true),
  ('R42', 'Dizziness and giddiness', 'Symptoms', 'Neurological', true, true),
  ('R11.2', 'Nausea with vomiting, unspecified', 'Symptoms', 'Gastrointestinal', true, true),
  ('K21.0', 'GERD with esophagitis', 'Digestive', 'Esophageal', true, true),
  ('K21.9', 'GERD without esophagitis', 'Digestive', 'Esophageal', true, true),
  ('K59.00', 'Constipation, unspecified', 'Digestive', 'Bowel', true, true),
  ('K58.9', 'Irritable bowel syndrome without diarrhea', 'Digestive', 'Bowel', true, true),
  ('F41.9', 'Anxiety disorder, unspecified', 'Mental Health', 'Anxiety', true, true),
  ('F41.1', 'Generalized anxiety disorder', 'Mental Health', 'Anxiety', true, true),
  ('F32.9', 'Major depressive disorder, single episode, unspecified', 'Mental Health', 'Depression', true, true),
  ('F33.0', 'Major depressive disorder, recurrent, mild', 'Mental Health', 'Depression', true, true),
  ('F51.01', 'Primary insomnia', 'Mental Health', 'Sleep', true, true),
  ('N39.0', 'Urinary tract infection, site not specified', 'Genitourinary', 'Urinary', true, true),
  ('L30.9', 'Dermatitis, unspecified', 'Skin', 'Dermatitis', true, true),
  ('L70.0', 'Acne vulgaris', 'Skin', 'Acne', true, true),
  ('B34.9', 'Viral infection, unspecified', 'Infectious', 'Viral', true, true),
  ('B02.9', 'Zoster without complications (shingles)', 'Infectious', 'Viral', true, true),
  ('H66.90', 'Otitis media, unspecified', 'Ear', 'Middle ear', true, true),
  ('H10.9', 'Unspecified conjunctivitis', 'Eye', 'Conjunctiva', true, true),
  ('G43.909', 'Migraine, unspecified, not intractable', 'Neurological', 'Headache', true, true),
  ('Z00.00', 'General adult medical examination without findings', 'Preventive', 'Screening', true, true),
  ('Z12.31', 'Encounter for screening mammogram', 'Preventive', 'Screening', true, true),
  ('Z23', 'Encounter for immunization', 'Preventive', 'Immunization', true, true),
  ('Z71.3', 'Dietary counseling and surveillance', 'Preventive', 'Counseling', true, true),
  ('T78.40', 'Allergy, unspecified', 'Injury', 'Allergy', true, true),
  ('S93.40', 'Sprain of unspecified ligament of ankle', 'Injury', 'Musculoskeletal', true, true),
  ('W19', 'Unspecified fall', 'Injury', 'External cause', true, true),
  ('R73.03', 'Prediabetes', 'Endocrine', 'Metabolic', true, true)
ON CONFLICT DO NOTHING;

INSERT INTO procedure_codes (code, code_system, description, category, typical_fee, commonly_used, is_active) VALUES
  ('99201', 'CPT', 'Office visit, new patient, straightforward, 15-29 min', 'E&M', 75.00, true, true),
  ('99202', 'CPT', 'Office visit, new patient, low complexity, 15-29 min', 'E&M', 110.00, true, true),
  ('99203', 'CPT', 'Office visit, new patient, moderate, 30-44 min', 'E&M', 175.00, true, true),
  ('99204', 'CPT', 'Office visit, new patient, moderate-high, 45-59 min', 'E&M', 250.00, true, true),
  ('99205', 'CPT', 'Office visit, new patient, high complexity, 60-74 min', 'E&M', 325.00, true, true),
  ('99211', 'CPT', 'Office visit, established patient, minimal, 5 min', 'E&M', 30.00, true, true),
  ('99212', 'CPT', 'Office visit, established patient, straightforward, 10-19 min', 'E&M', 65.00, true, true),
  ('99213', 'CPT', 'Office visit, established patient, low complexity, 20-29 min', 'E&M', 110.00, true, true),
  ('99214', 'CPT', 'Office visit, established patient, moderate, 30-39 min', 'E&M', 165.00, true, true),
  ('99215', 'CPT', 'Office visit, established patient, high, 40-54 min', 'E&M', 225.00, true, true),
  ('99441', 'CPT', 'Telephone E&M, 5-10 minutes', 'Telehealth', 45.00, true, true),
  ('99442', 'CPT', 'Telephone E&M, 11-20 minutes', 'Telehealth', 85.00, true, true),
  ('99443', 'CPT', 'Telephone E&M, 21-30 minutes', 'Telehealth', 130.00, true, true),
  ('99421', 'CPT', 'Online digital E&M, 5-10 minutes', 'Telehealth', 40.00, true, true),
  ('99422', 'CPT', 'Online digital E&M, 11-20 minutes', 'Telehealth', 75.00, true, true),
  ('99381', 'CPT', 'Preventive visit, new patient, infant (under 1)', 'Preventive', 175.00, true, true),
  ('99382', 'CPT', 'Preventive visit, new patient, 1-4 years', 'Preventive', 175.00, true, true),
  ('99391', 'CPT', 'Preventive visit, established, infant (under 1)', 'Preventive', 150.00, true, true),
  ('99392', 'CPT', 'Preventive visit, established, 1-4 years', 'Preventive', 150.00, true, true),
  ('99395', 'CPT', 'Preventive visit, established, 18-39 years', 'Preventive', 175.00, true, true),
  ('99396', 'CPT', 'Preventive visit, established, 40-64 years', 'Preventive', 195.00, true, true),
  ('90471', 'CPT', 'Immunization administration, first vaccine', 'Immunization', 25.00, true, true),
  ('90472', 'CPT', 'Immunization administration, each additional vaccine', 'Immunization', 15.00, true, true),
  ('36415', 'CPT', 'Venipuncture for collection of specimen', 'Lab', 12.00, true, true),
  ('81001', 'CPT', 'Urinalysis, automated with microscopy', 'Lab', 8.00, true, true),
  ('80053', 'CPT', 'Comprehensive metabolic panel', 'Lab', 35.00, true, true),
  ('85025', 'CPT', 'Complete blood count (CBC) with differential', 'Lab', 18.00, true, true),
  ('80061', 'CPT', 'Lipid panel', 'Lab', 35.00, true, true),
  ('83036', 'CPT', 'Hemoglobin A1c', 'Lab', 22.00, true, true),
  ('84443', 'CPT', 'Thyroid stimulating hormone (TSH)', 'Lab', 30.00, true, true),
  ('93000', 'CPT', 'Electrocardiogram (ECG), complete', 'Diagnostic', 45.00, true, true),
  ('71045', 'CPT', 'Chest X-ray, single view', 'Diagnostic', 55.00, true, true),
  ('71046', 'CPT', 'Chest X-ray, 2 views', 'Diagnostic', 70.00, true, true),
  ('94010', 'CPT', 'Spirometry (pulmonary function test)', 'Diagnostic', 55.00, true, true),
  ('96127', 'CPT', 'Brief emotional/behavioral assessment', 'Behavioral Health', 15.00, true, true),
  ('99406', 'CPT', 'Smoking cessation counseling, 3-10 min', 'Counseling', 25.00, true, true),
  ('99407', 'CPT', 'Smoking cessation counseling, >10 min', 'Counseling', 55.00, true, true),
  ('11102', 'CPT', 'Tangential biopsy of skin', 'Procedures', 95.00, true, true),
  ('69210', 'CPT', 'Removal of impacted cerumen (ear wax)', 'Procedures', 65.00, true, true),
  ('10060', 'CPT', 'Incision and drainage of abscess', 'Procedures', 175.00, true, true)
ON CONFLICT DO NOTHING;

INSERT INTO clinical_templates (template_name, template_type, specialty, description, template_sections, is_system_template, is_active) VALUES
  (
    'General SOAP Note',
    'soap',
    NULL,
    'Standard SOAP note template for general clinical encounters',
    '{"subjective": "Chief Complaint:\n\nHistory of Present Illness:\n\nPast Medical History:\n\nMedications:\n\nAllergies:\n\nSocial History:\n\nReview of Systems:", "objective": "Vital Signs:\n\nPhysical Examination:\n- General:\n- HEENT:\n- Cardiovascular:\n- Respiratory:\n- Abdomen:\n- Extremities:\n- Neurological:", "assessment": "Primary Diagnosis:\n\nDifferential Diagnoses:\n\nSeverity/Complexity:", "plan": "Treatment:\n\nMedications:\n\nDiagnostic Tests:\n\nFollow-up:\n\nPatient Education:\n\nReferrals:"}'::jsonb,
    true,
    true
  ),
  (
    'Cardiology Consultation',
    'consultation',
    'cardiology',
    'Specialized template for cardiology consultation encounters',
    '{"subjective": "Reason for Consultation:\n\nCardiac History:\n\nRisk Factors:\n- Hypertension:\n- Diabetes:\n- Hyperlipidemia:\n- Smoking:\n- Family History:\n\nSymptoms:\n- Chest Pain:\n- Shortness of Breath:\n- Palpitations:\n- Syncope:", "objective": "Vital Signs:\n- BP:\n- HR:\n- RR:\n- O2 Sat:\n\nCardiovascular Exam:\n- Heart Sounds:\n- Murmurs:\n- Peripheral Pulses:\n- Edema:\n\nECG Findings:\n\nEchocardiogram (if available):", "assessment": "Cardiovascular Assessment:\n\nRisk Stratification:\n\nPrognosis:", "plan": "Cardiac Management Plan:\n\nMedications:\n\nLifestyle Modifications:\n\nDiagnostic Studies:\n\nFollow-up:"}'::jsonb,
    true,
    true
  ),
  (
    'Pediatric Well-Child Visit',
    'soap',
    'pediatrics',
    'Template for well-child visits with growth and developmental assessment',
    '{"subjective": "Interval History:\n\nDevelopmental Milestones:\n\nFeeding/Nutrition:\n\nSleep Patterns:\n\nBehavior:\n\nParental Concerns:", "objective": "Growth Parameters:\n- Weight:\n- Height:\n- Head Circumference:\n- BMI:\n\nPhysical Examination:\n- General:\n- HEENT:\n- Cardiovascular:\n- Respiratory:\n- Abdomen:\n- Extremities:\n- Neurological:\n- Skin:\n\nDevelopmental Assessment:", "assessment": "Well-Child Assessment:\n\nGrowth and Development:\n\nNutritional Status:", "plan": "Immunizations:\n\nAnticipatory Guidance:\n\nScreening Tests:\n\nFollow-up:"}'::jsonb,
    true,
    true
  )
ON CONFLICT DO NOTHING;
