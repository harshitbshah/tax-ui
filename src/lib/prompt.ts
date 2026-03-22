export const INDIA_ITR1_PROMPT = `Extract all tax data from this Indian ITR-1 (Sahaj) PDF.

ASSESSMENT YEAR vs FINANCIAL YEAR:
- assessmentYear: the AY string printed on the form, e.g. "2012-13" (2-digit end year, not "2012-2013")
- financialYear: the START year of the financial year. AY 2012-13 = FY 2011-12 → financialYear = 2011

itrForm: set to "ITR-1"

CAPITAL GAINS: ITR-1 does NOT allow capital gains. Set to zero/empty:
- income.capitalGains.stcg: { items: [], total: 0 }
- income.capitalGains.ltcg: { items: [], total: 0 }

INCOME:
- salary: salary/pension (label = "Salary" or employer name, amount = gross salary after standard deduction if shown)
- houseProperty: income from one house property (net annual value after 30% statutory deduction)
- otherSources: interest, dividends, family pension, etc. List each separately if itemized.
- grossTotal: Gross Total Income as printed on form

DEDUCTIONS (Chapter VI-A):
- Use section code as label: "80C", "80D", "80G", "80TTA", "80CCD(1B)", etc.
- taxableIncome = grossTotal - sum(deductions)

TAX COMPUTATION:
- grossTax: tax before cess from slab computation
- surcharge: 0 for most ITR-1 filers (only applies above ₹50L income)
- educationCess: 3% of (grossTax + surcharge) for AY up to 2018-19; 4% from AY 2019-20 onwards
- totalTaxLiability: grossTax + surcharge + educationCess

TAXES PAID:
- tds: each TDS entry separately — label = deductor name or type (e.g. "Employer TDS", "Bank TDS"), amount = tax deducted
- advanceTax: advance tax paid (typically empty for pure salaried filers)
- selfAssessmentTax: self-assessment tax paid
- totalTaxPaid: sum of all tds + advanceTax + selfAssessmentTax
- refundOrDue: positive = refund, negative = additional tax due

RULES:
1. All amounts in INR as plain numbers (no commas, no symbols)
2. Use empty arrays and 0 for missing fields
3. Extract PAN if visible (may be partially masked)
4. residencyStatus: "resident" (ITR-1 is only for residents)`;

export const INDIA_INCOME_PROMPT = `Extract INCOME DATA ONLY from this Indian ITR-2 PDF (Schedule CG, salary, OS, deductions).

itrForm: set to "ITR-2"

ASSESSMENT YEAR vs FINANCIAL YEAR:
- assessmentYear: the AY string printed on the form, e.g. "2025-26"
- financialYear: the START year of the financial year. AY 2025-26 = FY 2024-25 → financialYear = 2024

CAPITAL GAINS — read from SCHEDULE CG line items, NOT from Part B-TTI summary totals:
For AY 2025-26 onwards, Schedule CG splits STCG into:
- STCG (pre-Jul 23 2024) @15% — use this exact label
- STCG (post-Jul 23 2024) @20% — use this exact label
Losses are NEGATIVE numbers. For older years use "STCG (equity/MF)" etc.

For LTCG u/s 112A: split pre/post Jul 23 2024 if shown, e.g.:
- LTCG u/s 112A pre-Jul 23 2024 @10%
- LTCG u/s 112A post-Jul 23 2024 @12.5%

IMPORTANT: stcg.total and ltcg.total are the raw schedule totals (gains + losses).
grossTotal is the net chargeable capital gain after set-off, as shown in Part B-1.

CURRENCY: All amounts in INR as plain numbers. RESIDENCY STATUS: "resident", "non_resident", or "rnor".

For tax fields (grossTax, cess, TDS, refundOrDue) set 0 / empty arrays — these will be filled separately.`;

export const INDIA_TAX_PROMPT = `Extract TAX COMPUTATION DATA ONLY from this Indian ITR-2 PDF (Part B-TTI and Schedule TDS).

itrForm: set to "ITR-2"

Read from Part B-TTI (Tax on Total Income) and Schedule TDS. Do NOT re-extract income.

Fields to extract:
- grossTax: tax before cess (Part B-TTI line for "Tax payable on total income")
- surcharge: surcharge amount
- educationCess: education cess (3% for AY up to 2018-19; 4% from AY 2019-20 onwards)
- totalTaxLiability: grossTax + surcharge + educationCess
- tds: array of TDS entries from Schedule TDS (label = deductor name or schedule, amount = tax deducted)
- advanceTax: advance tax paid entries
- selfAssessmentTax: self-assessment tax paid entries
- totalTaxPaid: sum of all tds + advanceTax + selfAssessmentTax
- refundOrDue: positive = refund, negative = additional tax due

CURRENCY: All amounts in INR as plain numbers.
For income fields (salary, houseProperty, capitalGains, etc.) set empty arrays and 0 — these will be filled separately.`;

export const INDIA_EXTRACTION_PROMPT = `Extract all tax data from this Indian Income Tax Return (ITR) PDF.

itrForm: set to "ITR-2" (use this prompt only for ITR-2)

ASSESSMENT YEAR vs FINANCIAL YEAR:
- assessmentYear: the AY string printed on the form, e.g. "2025-26"
- financialYear: the START year of the financial year. AY 2025-26 = FY 2024-25 → financialYear = 2024

CAPITAL GAINS — read from SCHEDULE CG line items:
For AY 2025-26 onwards, Schedule CG splits STCG into:
- STCG (pre-Jul 23 2024) @15% — use this exact label
- STCG (post-Jul 23 2024) @20% — use this exact label
Losses are NEGATIVE. For older years use "STCG (equity/MF)" etc.
For LTCG u/s 112A split pre/post Jul 23 2024 if shown.

AMOUNT SIGNS: Gains positive, losses NEGATIVE. refundOrDue: positive = refund, negative = due.
CURRENCY: All amounts in INR as plain numbers. RESIDENCY STATUS: "resident", "non_resident", or "rnor".

RULES:
1. All amounts are numbers (no currency symbols, no commas)
2. Use empty arrays and 0 for missing fields
3. Extract PAN if visible (may be partially masked)
4. grossTotal = net chargeable capital gain after STCG/LTCG set-off
5. taxableIncome = grossTotal - sum(deductions)
6. totalTaxPaid = sum(tds) + sum(advanceTax) + sum(selfAssessmentTax)
7. refundOrDue = totalTaxPaid - totalTaxLiability`;

export const EXTRACTION_PROMPT = `Extract all tax data from this tax return PDF.

LABEL NORMALIZATION - Use these EXACT labels:

Income items:
- "W-2 wages" (for wages, salaries, tips)
- "Interest income"
- "Dividend income"
- "Qualified dividends"
- "Capital gains/losses"
- "IRA distributions"
- "Pension/annuity"
- "Social Security"
- "Business income"
- "Rental income"
- "K-1 income" (combined partnership, S-corp, estate/trust income from K-1s)
- "Farm income"
- "Unemployment compensation"
- "Gambling income"
- "Alimony received"
- "Royalty income"
- "Other income"

Federal deductions:
- "− Standard deduction" or "− Itemized deductions"
- "− Qualified business income deduction"
- "− SALT (capped)"
- "− Mortgage interest"
- "− Charitable contributions"
- "− Medical expenses"

Federal additional taxes (Schedule 2 - these are FEDERAL, not state):
- "Self-employment tax"
- "Additional Medicare tax"
- "Net investment income tax"
- "Alternative minimum tax"
- "Household employment tax"
- "Repayment of first-time homebuyer credit"

Federal payments:
- "Federal withholding"
- "Federal estimated payments"
- "Extension payment"
- "Other federal withholding"

State payments (use state-specific labels):
- "[State] withholding" (e.g., "NYS withholding", "CA withholding")
- "[City] withholding" (e.g., "NYC withholding")
- "Estimated payments"

RULES:
1. All amounts are numbers (no currency symbols)
2. For refundOrOwed: positive = refund, negative = owed
3. Calculate rates as percentages (22% = 22, not 0.22)
4. Effective rate = (tax / agi) * 100
5. Include all states found in the return
6. Use empty arrays and 0 for missing fields
7. IMPORTANT: Self-employment tax, Additional Medicare tax, Net investment income tax, and AMT are FEDERAL taxes from Schedule 2. Put them in federal.additionalTaxes, NOT in state adjustments.`;
