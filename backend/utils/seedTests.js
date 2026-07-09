/**
 * backend/utils/seedTests.js
 *
 * Inserts all common lab tests into the global Test library.
 * Run ONCE after setting up the database:
 *
 *   node backend/utils/seedTests.js
 *
 * What it does:
 *  - Skips tests that already exist (by code) — safe to re-run
 *  - Inserts with full parameters, headings, units, ranges
 *  - Adds interpretation text for each test
 *  - Uses admin user as createdBy
 */

require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const mongoose = require("mongoose");
const Test     = require("../models/testModel");
const User     = require("../models/userModel");

// ── Helper to build a parameter ────────────────────────────────────
const p = (name, fieldType = "numeric", unit = "", rangeMin = null, rangeMax = null, rangeText = "", isSubField = false, options = []) => ({
  name, fieldType, unit, rangeMin, rangeMax, rangeText, isSubField, options, showInReport: true,
});
const heading = (name)                   => p(name, "heading", "", null, null, "", false);
const field   = (name, unit, min, max, rangeText = "", sub = false) => p(name, "numeric", unit, min, max, rangeText, sub);
const subfield= (name, unit, min, max, rangeText = "") => p(name, "numeric", unit, min, max, rangeText, true);
const textF   = (name, expected = "", sub = false)     => p(name, "text", "", null, null, expected, sub);
const optionF = (name, options, sub = false)           => p(name, "option", "", null, null, "", sub, options);

// ══════════════════════════════════════════════════════════════════
// TEST DEFINITIONS
// ══════════════════════════════════════════════════════════════════
const TESTS = [

  // ─────────────────────────────────────────
  // 1. COMPLETE BLOOD COUNT (CBC)
  // ─────────────────────────────────────────
  {
    name: "Complete Blood Count (CBC)",
    code: "CBC-001",
    department: "HAEMATOLOGY",
    sampleType: "EDTA Blood",
    tat: "4 hrs",
    gender: "both",
    description: "A panel of blood tests that evaluates overall health and detects disorders.",
    interpretation: `INTERPRETATION GUIDE:
• Haemoglobin: Low values suggest anaemia; elevated may indicate polycythaemia.
• WBC Count: Elevated TLC may suggest infection or inflammation; low may indicate immunosuppression.
• Platelets: Thrombocytopenia (<1.5 Lakh) may cause bleeding risk; thrombocytosis (>4.5 Lakh) may suggest reactive or clonal disorders.
• Differential Count: Neutrophilia is common in bacterial infections; lymphocytosis in viral infections; eosinophilia in allergic conditions or parasitic infections.

Note: Results should be interpreted in conjunction with clinical findings.`,
    parameters: [
      field("Haemoglobin",          "g/dL",   12,    17,   "M: 13-17  F: 12-15"),
      field("Total Leucocyte Count (TLC)", "/cumm", 4000, 11000, "4000 - 11000"),
      field("Platelet Count",       "/cumm",  150000,410000,"1.5-4.1 Lakh"),
      field("Packed Cell Volume (PCV)", "%",   36,    50,   "M: 40-54  F: 36-48"),
      field("RBC Count",            "Mill/cumm", 3.8, 5.8, "M: 4.5-5.8  F: 3.8-5.2"),

      heading("RBC Indices"),
      subfield("MCV",  "fL",   80,  100, "80 - 100"),
      subfield("MCH",  "pg",   27,  33,  "27 - 33"),
      subfield("MCHC", "g/dL", 31.5,34.5,"31.5 - 34.5"),
      subfield("RDW-CV","%",   11.5,14.5,"11.5 - 14.5"),

      heading("Differential Leucocyte Count (DLC)"),
      subfield("Neutrophils",  "%", 40, 70, "40 - 70"),
      subfield("Lymphocytes",  "%", 20, 40, "20 - 40"),
      subfield("Monocytes",    "%",  2, 10, "2 - 10"),
      subfield("Eosinophils",  "%",  1,  6, "1 - 6"),
      subfield("Basophils",    "%",  0,  2, "0 - 2"),

      heading("Absolute Leucocyte Count"),
      subfield("Absolute Neutrophils",  "/cumm", 1800, 7500, "1800 - 7500"),
      subfield("Absolute Lymphocytes",  "/cumm", 1000, 4000, "1000 - 4000"),
      subfield("Absolute Monocytes",    "/cumm",  200, 1000, "200 - 1000"),
      subfield("Absolute Eosinophils",  "/cumm",   20,  500, "20 - 500"),

      heading("Platelet Indices"),
      subfield("MPV",    "fL", 7.5, 12.5, "7.5 - 12.5"),
      subfield("PDW",    "%",  10,  17,   "10 - 17"),
      subfield("PCT",    "%",   0.1, 0.5, "0.1 - 0.5"),
    ],
  },

  // ─────────────────────────────────────────
  // 2. LIVER FUNCTION TEST (LFT)
  // ─────────────────────────────────────────
  {
    name: "Liver Function Test (LFT)",
    code: "LFT-001",
    department: "BIOCHEMISTRY",
    sampleType: "Serum",
    tat: "6 hrs",
    gender: "both",
    description: "Evaluates liver health by measuring enzymes, proteins and bilirubin.",
    interpretation: `INTERPRETATION GUIDE:
• Bilirubin: Elevated total/direct bilirubin indicates obstructive or hepatocellular jaundice.
• SGOT/SGPT: Elevated transaminases suggest hepatocellular damage. SGPT is more specific for liver injury.
• Alkaline Phosphatase: Elevation suggests cholestatic disease, bone disorders, or metastatic liver disease.
• Total Protein/Albumin: Low albumin reflects poor synthetic function — indicator of chronic liver disease.
• Globulin: Elevated in chronic inflammatory states and cirrhosis.
• A:G Ratio: Ratio below 1 may suggest liver disease or protein disorders.

Note: Interpret in clinical context. Alcohol, drugs, and strenuous exercise can alter values.`,
    parameters: [
      heading("Bilirubin"),
      subfield("Total Bilirubin",    "mg/dL", 0.2, 1.2,  "0.2 - 1.2"),
      subfield("Direct Bilirubin",   "mg/dL", 0.0, 0.4,  "0.0 - 0.4"),
      subfield("Indirect Bilirubin", "mg/dL", 0.2, 0.9,  "0.2 - 0.9"),

      heading("Liver Enzymes"),
      subfield("SGOT (AST)",             "U/L",  10,  40,  "10 - 40"),
      subfield("SGPT (ALT)",             "U/L",   7,  56,  "7 - 56"),
      subfield("Alkaline Phosphatase",   "U/L",  44, 147,  "44 - 147"),
      subfield("Gamma GT (GGT)",         "U/L",   8,  61,  "M: 12-64  F: 8-42"),

      heading("Proteins"),
      subfield("Total Protein",  "g/dL", 6.0, 8.3, "6.0 - 8.3"),
      subfield("Albumin",        "g/dL", 3.4, 5.4, "3.4 - 5.4"),
      subfield("Globulin",       "g/dL", 2.0, 3.5, "2.0 - 3.5"),
      subfield("A : G Ratio",    "",     1.2, 2.2, "1.2 - 2.2"),
    ],
  },

  // ─────────────────────────────────────────
  // 3. KIDNEY FUNCTION TEST (KFT / RFT)
  // ─────────────────────────────────────────
  {
    name: "Kidney Function Test (KFT)",
    code: "KFT-001",
    department: "BIOCHEMISTRY",
    sampleType: "Serum",
    tat: "6 hrs",
    gender: "both",
    description: "Assesses kidney function by measuring waste products and electrolytes.",
    interpretation: `INTERPRETATION GUIDE:
• Urea / BUN: Elevated in renal failure, dehydration, high-protein diet, or GI bleeding.
• Creatinine: Most reliable marker of GFR. Elevated in renal impairment.
• Uric Acid: Elevated in gout, renal failure, or diuretic therapy.
• Sodium: Hyponatremia in SIADH, cirrhosis; Hypernatremia in dehydration.
• Potassium: Hyperkalemia in renal failure, Addison's disease; Hypokalemia in diarrhoea, diuretics.
• Chloride: Closely follows sodium changes.

Note: eGFR should be calculated for staging chronic kidney disease.`,
    parameters: [
      field("Blood Urea",        "mg/dL",  15,  40,  "15 - 40"),
      field("Serum Creatinine",  "mg/dL", 0.7, 1.3, "M: 0.9-1.3  F: 0.7-1.1"),
      field("Uric Acid",         "mg/dL", 3.5, 7.2, "M: 4.0-7.2  F: 3.5-6.0"),
      field("eGFR",              "mL/min/1.73m²", 60, 120, "> 60"),

      heading("Electrolytes"),
      subfield("Sodium",    "mEq/L", 136, 145, "136 - 145"),
      subfield("Potassium", "mEq/L", 3.5, 5.0, "3.5 - 5.0"),
      subfield("Chloride",  "mEq/L",  98, 106, "98 - 106"),
      subfield("Bicarbonate","mEq/L", 22,  29, "22 - 29"),

      heading("Calcium & Phosphorus"),
      subfield("Calcium",    "mg/dL",  8.5, 10.5, "8.5 - 10.5"),
      subfield("Phosphorus", "mg/dL",  2.5, 4.5,  "2.5 - 4.5"),
    ],
  },

  // ─────────────────────────────────────────
  // 4. LIPID PROFILE
  // ─────────────────────────────────────────
  {
    name: "Lipid Profile",
    code: "LIP-001",
    department: "BIOCHEMISTRY",
    sampleType: "Serum (12 hr fasting)",
    tat: "6 hrs",
    gender: "both",
    description: "Measures fats and fatty substances in the blood to assess cardiovascular risk.",
    interpretation: `INTERPRETATION GUIDE:
• Total Cholesterol: Desirable <200 mg/dL; Borderline 200-239; High ≥240.
• LDL Cholesterol: Target <100 mg/dL for high-risk patients; <130 for average risk.
• HDL Cholesterol: Protective; Higher is better. Low HDL (<40 M / <50 F) is a risk factor.
• Triglycerides: Normal <150; Borderline 150-199; High 200-499; Very High ≥500.
• VLDL: Elevated VLDL reflects high triglycerides.
• Non-HDL Cholesterol: Good overall cardiovascular risk marker; target <130 mg/dL.

Note: Patient should be fasting for 12 hours. Lifestyle modification recommended for abnormal values.`,
    parameters: [
      field("Total Cholesterol",    "mg/dL",   0, 200, "Desirable: < 200"),
      field("Triglycerides",        "mg/dL",   0, 150, "Normal: < 150"),
      field("HDL Cholesterol",      "mg/dL",  40, 999, "M: > 40   F: > 50"),
      field("LDL Cholesterol",      "mg/dL",   0, 100, "Desirable: < 100"),
      field("VLDL Cholesterol",     "mg/dL",   5,  40, "5 - 40"),
      field("Non-HDL Cholesterol",  "mg/dL",   0, 130, "Desirable: < 130"),
      field("LDL/HDL Ratio",        "",        0, 3.5, "< 3.5"),
      field("Total Cholesterol/HDL","",        0, 4.5, "< 4.5"),
    ],
  },

  // ─────────────────────────────────────────
  // 5. THYROID FUNCTION TEST (TFT)
  // ─────────────────────────────────────────
  {
    name: "Thyroid Function Test (TFT)",
    code: "TFT-001",
    department: "IMMUNOASSAY",
    sampleType: "Serum",
    tat: "8 hrs",
    gender: "both",
    description: "Evaluates thyroid gland function by measuring thyroid hormones.",
    interpretation: `INTERPRETATION GUIDE:
• TSH: Best initial screening test. Elevated TSH = hypothyroidism; Suppressed TSH = hyperthyroidism.
• Free T4 (FT4): Low FT4 + High TSH = Primary Hypothyroidism.
• Free T3 (FT3): Useful in T3 toxicosis. Low in hypothyroidism.
• Total T3 / T4: Less preferred over free fractions but still useful clinically.

Pattern Summary:
  Primary Hypothyroidism:  High TSH, Low FT4
  Primary Hyperthyroidism: Low TSH, High FT4/FT3
  Subclinical Hypothyroid: High TSH, Normal FT4
  Subclinical Hyper:       Low TSH, Normal FT4

Note: Pregnancy, medications (steroids, biotin) can alter values.`,
    parameters: [
      field("TSH (Thyroid Stimulating Hormone)", "µIU/mL", 0.35, 5.5, "0.35 - 5.50"),
      field("Free T3 (FT3)",                     "pg/mL",  2.3,  4.2, "2.3 - 4.2"),
      field("Free T4 (FT4)",                     "ng/dL",  0.89, 1.76,"0.89 - 1.76"),
      field("Total T3 (TT3)",                    "ng/dL",  60,  200,  "60 - 200"),
      field("Total T4 (TT4)",                    "µg/dL",  4.5, 12.5, "4.5 - 12.5"),
    ],
  },

  // ─────────────────────────────────────────
  // 6. BLOOD GLUCOSE (FASTING + PP + RANDOM)
  // ─────────────────────────────────────────
  {
    name: "Blood Glucose (Fasting)",
    code: "GLU-F-001",
    department: "BIOCHEMISTRY",
    sampleType: "Plasma (Fluoride)",
    tat: "2 hrs",
    gender: "both",
    description: "Measures blood sugar level after at least 8 hours of fasting.",
    interpretation: `INTERPRETATION GUIDE:
• Normal: 70 - 100 mg/dL
• Impaired Fasting Glucose (Pre-diabetes): 100 - 125 mg/dL
• Diabetes Mellitus: ≥ 126 mg/dL (on two separate occasions)

Note: Must be fasting for at least 8 hours. Confirm diabetes with repeat test or HbA1c.`,
    parameters: [
      field("Fasting Blood Glucose", "mg/dL", 70, 100, "70 - 100"),
    ],
  },

  {
    name: "Blood Glucose (Post Prandial)",
    code: "GLU-PP-001",
    department: "BIOCHEMISTRY",
    sampleType: "Plasma (Fluoride)",
    tat: "2 hrs",
    gender: "both",
    description: "Measures blood sugar level 2 hours after a meal.",
    interpretation: `INTERPRETATION GUIDE:
• Normal: < 140 mg/dL (2 hrs after meal)
• Impaired Glucose Tolerance: 140 - 199 mg/dL
• Diabetes Mellitus: ≥ 200 mg/dL

Note: Patient should consume standard meal (75g glucose in 250mL water) for OGTT.`,
    parameters: [
      field("Post Prandial Blood Glucose", "mg/dL", 0, 140, "< 140"),
    ],
  },

  // ─────────────────────────────────────────
  // 7. HbA1c
  // ─────────────────────────────────────────
  {
    name: "HbA1c (Glycated Haemoglobin)",
    code: "HBA1C-001",
    department: "BIOCHEMISTRY",
    sampleType: "EDTA Blood",
    tat: "4 hrs",
    gender: "both",
    description: "Reflects average blood glucose levels over the past 2-3 months.",
    interpretation: `INTERPRETATION GUIDE:
• Normal (Non-diabetic):     < 5.7%
• Pre-diabetes:              5.7% - 6.4%
• Diabetes Mellitus:         ≥ 6.5%
• Well-controlled Diabetes:  < 7.0%
• Poor Control:              > 8.0%

Estimated Average Glucose (eAG):
  HbA1c 6% ≈ 126 mg/dL
  HbA1c 7% ≈ 154 mg/dL
  HbA1c 8% ≈ 183 mg/dL
  HbA1c 9% ≈ 212 mg/dL

Note: Haemoglobin variants (HbS, HbC) can falsely alter HbA1c results.`,
    parameters: [
      field("HbA1c",                    "%",      0,   5.6, "< 5.7"),
      field("Estimated Average Glucose","mg/dL",  0,   120, "< 126"),
    ],
  },

  // ─────────────────────────────────────────
  // 8. URINE ROUTINE EXAMINATION
  // ─────────────────────────────────────────
  {
    name: "Urine Routine Examination",
    code: "URE-001",
    department: "URINE ANALYSIS",
    sampleType: "Midstream Urine",
    tat: "2 hrs",
    gender: "both",
    description: "Physical, chemical and microscopic examination of urine.",
    interpretation: `INTERPRETATION GUIDE:
• Protein: Presence may indicate nephrotic syndrome, UTI, or pre-eclampsia.
• Glucose: Glycosuria suggests diabetes or renal tubular disorders.
• Pus Cells: >5 per HPF suggests UTI or inflammation.
• RBCs: >3 per HPF suggests haematuria — investigate for UTI, stones, or malignancy.
• Casts: Hyaline casts are normal; granular/cellular casts suggest renal parenchymal disease.
• Bacteria: Presence with pus cells suggests active urinary tract infection.

Note: Urine should be examined within 2 hours of collection.`,
    parameters: [
      heading("Physical Examination"),
      subfield("Colour",       "", null, null, "Pale Yellow to Yellow"),
      subfield("Appearance",   "", null, null, "Clear"),
      subfield("Specific Gravity","",  1.005, 1.030, "1.005 - 1.030"),
      subfield("pH",           "",    5.0,   8.0,  "5.0 - 8.0"),

      heading("Chemical Examination"),
      p("Protein",  "option", "",null,null,"Nil",false,["Nil","Trace","+","++","+++"]),
      p("Glucose",  "option", "",null,null,"Nil",false,["Nil","Trace","+","++","+++"]),
      p("Ketones",  "option", "",null,null,"Nil",false,["Nil","Trace","+","++","+++"]),
      p("Bilirubin","option", "",null,null,"Nil",false,["Nil","+"]),
      p("Blood",    "option", "",null,null,"Nil",false,["Nil","Trace","+","++","+++"]),
      p("Nitrite",  "option", "",null,null,"Negative",false,["Negative","Positive"]),
      p("Urobilinogen","option","",null,null,"Normal",false,["Normal","Increased"]),

      heading("Microscopic Examination (per HPF)"),
      subfield("Pus Cells (WBC)",    "/HPF", 0, 5,  "0 - 5"),
      subfield("Red Blood Cells",    "/HPF", 0, 3,  "0 - 3"),
      subfield("Epithelial Cells",   "/HPF", null,null,"Occasional"),
      subfield("Casts",              "/LPF", null,null,"Nil"),
      subfield("Bacteria",           "",     null,null,"Nil"),
      subfield("Crystals",           "",     null,null,"Nil"),
    ],
  },

  // ─────────────────────────────────────────
  // 9. WIDAL TEST
  // ─────────────────────────────────────────
  {
    name: "Widal Test",
    code: "WIDAL-001",
    department: "SEROLOGY",
    sampleType: "Serum",
    tat: "4 hrs",
    gender: "both",
    description: "Serological test for diagnosis of enteric fever (Typhoid).",
    interpretation: `INTERPRETATION GUIDE:
• Salmonella Typhi O ≥ 1:80 and H ≥ 1:160 suggest active infection.
• Rising titres on repeat testing (after 7-10 days) are more significant.
• A single high titre in a febrile patient may suggest typhoid.
• Para-typhi A (AH) and B (BH) titres help identify paratyphoid.
• Negative results do not rule out typhoid — culture is gold standard.

Note: Prior vaccination, endemic area residence, or cross-reactive infections may give false positives.`,
    parameters: [
      heading("Salmonella Typhi"),
      p("S. Typhi O Antigen",  "option","",null,null,"Negative",true,["Negative","1:20","1:40","1:80","1:160","1:320"]),
      p("S. Typhi H Antigen",  "option","",null,null,"Negative",true,["Negative","1:20","1:40","1:80","1:160","1:320"]),

      heading("Salmonella Paratyphi A"),
      p("S. Paratyphi AH Antigen","option","",null,null,"Negative",true,["Negative","1:20","1:40","1:80","1:160","1:320"]),

      heading("Salmonella Paratyphi B"),
      p("S. Paratyphi BH Antigen","option","",null,null,"Negative",true,["Negative","1:20","1:40","1:80","1:160","1:320"]),
    ],
  },

  // ─────────────────────────────────────────
  // 10. VITAMIN D (25-OH)
  // ─────────────────────────────────────────
  {
    name: "Vitamin D (25-OH Total)",
    code: "VITD-001",
    department: "IMMUNOASSAY",
    sampleType: "Serum",
    tat: "24 hrs",
    gender: "both",
    description: "Measures total 25-hydroxyvitamin D level to assess Vitamin D status.",
    interpretation: `INTERPRETATION GUIDE:
• Deficient:    < 20 ng/mL  — Supplementation strongly recommended
• Insufficient: 20-29 ng/mL — Supplementation recommended
• Sufficient:   30-100 ng/mL — Adequate level
• Toxicity:     > 100 ng/mL — Risk of hypercalcaemia

Common causes of deficiency: Poor sun exposure, malabsorption, chronic kidney disease, obesity.

Note: Results should be correlated with calcium, phosphorus, and PTH levels.`,
    parameters: [
      field("25-OH Vitamin D Total", "ng/mL", 30, 100, "Sufficient: 30 - 100"),
    ],
  },

  // ─────────────────────────────────────────
  // 11. VITAMIN B12
  // ─────────────────────────────────────────
  {
    name: "Vitamin B12",
    code: "VITB12-001",
    department: "IMMUNOASSAY",
    sampleType: "Serum",
    tat: "24 hrs",
    gender: "both",
    description: "Measures serum Vitamin B12 (Cobalamin) level.",
    interpretation: `INTERPRETATION GUIDE:
• Deficient:  < 200 pg/mL  — Associated with megaloblastic anaemia, neuropathy
• Borderline: 200-300 pg/mL — May need supplementation
• Normal:     300-900 pg/mL
• Elevated:   > 900 pg/mL  — May occur in liver disease, myeloproliferative disorders

Risk factors for deficiency: Vegetarian/vegan diet, pernicious anaemia, gastric surgery, metformin use.

Note: Correlate with CBC (MCV, RBC morphology) and folate levels.`,
    parameters: [
      field("Vitamin B12 (Cobalamin)", "pg/mL", 300, 900, "300 - 900"),
    ],
  },

  // ─────────────────────────────────────────
  // 12. IRON STUDIES
  // ─────────────────────────────────────────
  {
    name: "Iron Studies",
    code: "IRON-001",
    department: "BIOCHEMISTRY",
    sampleType: "Serum",
    tat: "6 hrs",
    gender: "both",
    description: "Evaluates iron metabolism to diagnose anaemia and iron overload.",
    interpretation: `INTERPRETATION GUIDE:
• Serum Iron: Low in iron deficiency; elevated in haemochromatosis, haemolytic anaemia.
• TIBC: Elevated in iron deficiency; decreased in chronic disease, malnutrition.
• Transferrin Saturation: < 16% suggests iron deficiency; > 50% suggests iron overload.
• Serum Ferritin: Best marker for iron stores. Low = depleted stores; Elevated = acute phase reactant.

Pattern in Iron Deficiency: Low Iron, High TIBC, Low Ferritin, Low Saturation.
Pattern in Anaemia of Chronic Disease: Low Iron, Low/Normal TIBC, High/Normal Ferritin.`,
    parameters: [
      field("Serum Iron",            "µg/dL",  60,  170, "M: 70-180  F: 60-160"),
      field("TIBC",                  "µg/dL", 250,  370, "250 - 370"),
      field("Transferrin Saturation","%",       20,   50, "20 - 50"),
      field("Serum Ferritin",        "ng/mL",  12,  300, "M: 30-400  F: 12-150"),
      field("UIBC",                  "µg/dL", 110,  370, "110 - 370"),
    ],
  },

  // ─────────────────────────────────────────
  // 13. CRP (C-Reactive Protein)
  // ─────────────────────────────────────────
  {
    name: "C-Reactive Protein (CRP)",
    code: "CRP-001",
    department: "IMMUNOASSAY",
    sampleType: "Serum",
    tat: "4 hrs",
    gender: "both",
    description: "Marker of inflammation and acute phase response.",
    interpretation: `INTERPRETATION GUIDE:
• Normal:        < 6 mg/L
• Mild elevation:  6-20 mg/L — Minor infection, inflammation
• Moderate:      20-200 mg/L — Active infection, flare of chronic disease
• Severe:        > 200 mg/L — Serious bacterial infection, sepsis, major trauma

Used to:
  - Monitor response to antibiotic therapy
  - Detect post-operative complications
  - Differentiate bacterial from viral infection (usually higher in bacterial)

Note: CRP is non-specific; interpret with clinical presentation.`,
    parameters: [
      field("CRP (Quantitative)", "mg/L", 0, 6, "< 6"),
    ],
  },

  // ─────────────────────────────────────────
  // 14. DENGUE NS1 + IgM/IgG
  // ─────────────────────────────────────────
  {
    name: "Dengue Profile (NS1 + IgM + IgG)",
    code: "DENGUE-001",
    department: "SEROLOGY",
    sampleType: "Serum",
    tat: "4 hrs",
    gender: "both",
    description: "Combination test for dengue fever diagnosis including antigen and antibodies.",
    interpretation: `INTERPRETATION GUIDE:
• NS1 Antigen: Detectable from Day 1-9 of fever. Positive = Active early dengue infection.
• IgM Antibody: Appears from Day 4-5. Indicates recent/current infection.
• IgG Antibody: Appears later and persists for years. Indicates past infection or secondary infection.

Interpretation Patterns:
  NS1 +, IgM -, IgG - → Early primary infection
  NS1 +, IgM +, IgG - → Primary infection (5-9 days)
  NS1 +, IgM +, IgG + → Secondary infection
  NS1 -, IgM +, IgG - → Primary infection (after Day 5)
  NS1 -, IgM -, IgG + → Past infection / immunity

Note: Negative results do not exclude dengue. Repeat testing if clinically suspected.`,
    parameters: [
      p("Dengue NS1 Antigen", "option","",null,null,"Negative",false,["Negative","Positive"]),
      p("Dengue IgM Antibody","option","",null,null,"Negative",false,["Negative","Positive"]),
      p("Dengue IgG Antibody","option","",null,null,"Negative",false,["Negative","Positive"]),
    ],
  },

  // ─────────────────────────────────────────
  // 15. MALARIA ANTIGEN TEST
  // ─────────────────────────────────────────
  {
    name: "Malaria Antigen Test (Rapid)",
    code: "MAL-001",
    department: "SEROLOGY",
    sampleType: "EDTA Blood",
    tat: "2 hrs",
    gender: "both",
    description: "Rapid antigen test for detection of P. falciparum and P. vivax.",
    interpretation: `INTERPRETATION GUIDE:
• P. falciparum HRP-2 Antigen: Specific for falciparum malaria. Positive = active infection.
• Pan-Malaria Antigen (pLDH): Detects all Plasmodium species (vivax, malariae, ovale).

Positive result requires immediate antimalarial treatment.
• P. falciparum: Treat with ACT (Artemisinin-based combination therapy).
• P. vivax: Treat with Chloroquine + Primaquine (test for G6PD deficiency first).

Note: RDTs may remain positive for weeks after successful treatment due to antigen persistence.
Confirm with peripheral blood smear in equivocal cases.`,
    parameters: [
      p("P. falciparum Antigen (HRP-2)", "option","",null,null,"Negative",false,["Negative","Positive"]),
      p("Pan Malaria Antigen (pLDH)",    "option","",null,null,"Negative",false,["Negative","Positive"]),
    ],
  },

  // ─────────────────────────────────────────
  // 16. HIV (1 & 2)
  // ─────────────────────────────────────────
  {
    name: "HIV 1 & 2 Antibody Test",
    code: "HIV-001",
    department: "SEROLOGY",
    sampleType: "Serum",
    tat: "4 hrs",
    gender: "both",
    description: "Screening test for HIV 1 and HIV 2 antibodies.",
    interpretation: `INTERPRETATION GUIDE:
• Non-Reactive: No HIV antibodies detected. Result is negative.
• Reactive: Indicates presence of HIV antibodies. Requires confirmation by Western Blot / NAAT.

Window Period: Standard ELISA may miss very early infections (0-45 days post exposure).
4th generation tests (Ag/Ab combo) detect both p24 antigen and antibodies.

Note: All reactive results must be confirmed with supplementary testing as per NACO guidelines.
Confidential counselling must accompany all HIV testing.`,
    parameters: [
      p("HIV 1 Antibody", "option","",null,null,"Non-Reactive",false,["Non-Reactive","Reactive"]),
      p("HIV 2 Antibody", "option","",null,null,"Non-Reactive",false,["Non-Reactive","Reactive"]),
    ],
  },

  // ─────────────────────────────────────────
  // 17. HBsAg (Hepatitis B Surface Antigen)
  // ─────────────────────────────────────────
  {
    name: "HBsAg (Hepatitis B Surface Antigen)",
    code: "HBSAG-001",
    department: "SEROLOGY",
    sampleType: "Serum",
    tat: "4 hrs",
    gender: "both",
    description: "Detects Hepatitis B surface antigen to screen for Hepatitis B infection.",
    interpretation: `INTERPRETATION GUIDE:
• Non-Reactive: HBsAg not detected. Does not rule out window period infection.
• Reactive: Indicates active HBV infection (acute or chronic). Requires further workup.

If Reactive, order: HBeAg, Anti-HBe, HBV DNA, LFT, Anti-HBc (IgM + IgG).

Chronic Hepatitis B: HBsAg positive for > 6 months.
Consider antiviral therapy if HBV DNA > 2000 IU/mL with liver disease.

Note: Vaccination history and anti-HBs level should be correlated.`,
    parameters: [
      p("HBsAg", "option","",null,null,"Non-Reactive",false,["Non-Reactive","Reactive"]),
    ],
  },

  // ─────────────────────────────────────────
  // 18. URIC ACID
  // ─────────────────────────────────────────
  {
    name: "Uric Acid",
    code: "UA-001",
    department: "BIOCHEMISTRY",
    sampleType: "Serum",
    tat: "4 hrs",
    gender: "both",
    description: "Measures serum uric acid level for gout and renal function assessment.",
    interpretation: `INTERPRETATION GUIDE:
• Normal: Male 3.5-7.2 mg/dL | Female 2.6-6.0 mg/dL
• Hyperuricaemia: > 7 mg/dL (Men) / > 6 mg/dL (Women)
  - Risk of gout, uric acid kidney stones, renal impairment
• Hypouricaemia: < 2 mg/dL (rare; seen in Wilson's disease, Fanconi syndrome)

Common causes of elevated uric acid:
  Gout, Chronic renal failure, Diuretic use, High purine diet, Myeloproliferative disorders, Chemotherapy

Note: Acute gout may occur with normal uric acid levels. Dietary advice: avoid organ meats, alcohol, seafood.`,
    parameters: [
      field("Uric Acid", "mg/dL", 3.5, 7.2, "M: 3.5-7.2  F: 2.6-6.0"),
    ],
  },

  // ─────────────────────────────────────────
  // 19. PSA (Prostate Specific Antigen)
  // ─────────────────────────────────────────
  {
    name: "PSA (Prostate Specific Antigen)",
    code: "PSA-001",
    department: "IMMUNOASSAY",
    sampleType: "Serum",
    tat: "8 hrs",
    gender: "male",
    description: "Screening marker for prostate health and cancer risk.",
    interpretation: `INTERPRETATION GUIDE:
• Normal:        < 4.0 ng/mL
• Borderline:    4.0-10.0 ng/mL (grey zone; ~25% risk of prostate cancer)
• Elevated:      > 10.0 ng/mL (>50% risk of prostate cancer)

PSA Velocity: Rising PSA > 0.75 ng/mL/year is significant.
Free PSA Ratio: Free PSA/Total PSA < 15% increases suspicion for malignancy.

Causes of elevated PSA (benign):
  BPH, Prostatitis, Post-digital rectal exam, Post-biopsy, UTI

Note: PSA alone is not diagnostic. Correlation with digital rectal exam and biopsy is essential.`,
    parameters: [
      field("Total PSA",  "ng/mL", 0, 4, "< 4.0"),
      field("Free PSA",   "ng/mL", null, null, ""),
      field("Free/Total PSA Ratio", "%", 15, 100, "> 15% (Lower risk)"),
    ],
  },

  // ─────────────────────────────────────────
  // 20. BLOOD CULTURE (Placeholder)
  // ─────────────────────────────────────────
  {
    name: "Blood Culture & Sensitivity",
    code: "BC-001",
    department: "MICROBIOLOGY",
    sampleType: "Blood (Aseptic)",
    tat: "5-7 days",
    gender: "both",
    description: "Culture of blood to identify causative organisms in sepsis.",
    interpretation: `INTERPRETATION GUIDE:
• No Growth (after 5 days): Suggests no bacterial/fungal infection, or may be due to prior antibiotic use.
• Growth Detected: Organism identified with antibiotic sensitivity pattern.

Common organisms in bacteraemia:
  - Staphylococcus aureus (skin source)
  - E. coli, Klebsiella (urinary/GI source)
  - Streptococcus pneumoniae (respiratory)
  - Candida species (in immunocompromised)

Sensitivity Report: Use narrowest-spectrum antibiotic to which organism is sensitive (antimicrobial stewardship).

Note: Collect 2-3 sets from different sites before starting antibiotics.`,
    parameters: [
      p("Culture Result",   "option","",null,null,"No Growth",false,["No Growth","Growth Detected","Contaminated"]),
      textF("Organism Identified", "No Growth"),
      textF("Sensitivity / Resistance Pattern", "Not Applicable"),
      textF("Remarks", ""),
    ],
  },

];

// ══════════════════════════════════════════════════════════════════
// SEED FUNCTION
// ══════════════════════════════════════════════════════════════════
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("✅ Connected to MongoDB\n");

  // Get admin user to set as createdBy
  const admin = await User.findOne({ role: "admin" });
  if (!admin) {
    console.error("❌ No admin user found. Run seedAdmin.js first.");
    process.exit(1);
  }
  console.log(`👤 Using admin: ${admin.email}\n`);

  let inserted = 0;
  let skipped  = 0;
  let failed   = 0;

  for (const testData of TESTS) {
    try {
      const exists = await Test.findOne({ code: testData.code });
      if (exists) {
        console.log(`⏭️  SKIP   ${testData.code.padEnd(16)} — ${testData.name}`);
        skipped++;
        continue;
      }

      // Add order index to each parameter
      const parameters = testData.parameters.map((param, i) => ({
        ...param,
        order: i,
      }));

      await Test.create({
        ...testData,
        parameters,
        createdBy:     admin._id,
        createdByRole: "admin",
        isActive:      true,
      });

      console.log(`✅ INSERT ${testData.code.padEnd(16)} — ${testData.name} (${parameters.length} params)`);
      inserted++;
    } catch (err) {
      console.error(`❌ FAIL   ${testData.code.padEnd(16)} — ${testData.name}: ${err.message}`);
      failed++;
    }
  }

  console.log(`
══════════════════════════════
📊 SEED SUMMARY
   Inserted : ${inserted}
   Skipped  : ${skipped}
   Failed   : ${failed}
   Total    : ${TESTS.length}
══════════════════════════════`);

  process.exit(0);
}

seed().catch(err => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});