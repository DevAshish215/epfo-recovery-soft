# Phase-2: Excel Upload Engine Implementation

## ✅ Implementation Complete

### 📁 Backend Structure Created

```
backend/src/
├── modules/
│   ├── rrc/
│   │   ├── rrc.model.js          # RRC data model
│   │   ├── rrc.routes.js         # RRC API endpoints
│   │   └── rrc.service.js        # RRC business logic
│   ├── establishment/
│   │   ├── establishment.model.js    # Establishment model
│   │   ├── establishment.routes.js    # Establishment endpoints
│   │   └── establishment.service.js   # Establishment logic
├── services/
│   ├── excelValidator.service.js      # Excel validation
│   ├── excelParser.service.js         # Excel parsing
│   └── financeCalculator.service.js   # Financial calculations
├── utils/
│   ├── excel.util.js                  # Excel utilities
│   └── response.util.js               # Response formatting
└── middlewares/
    └── upload.middleware.js           # File upload handling
```

## 🔧 Dependencies Added

- `multer` - File upload handling
- `xlsx` - Excel file parsing and generation

## 📊 RRC Module

### Model Features:
- Office isolation via `regional_office_code`
- Mandatory fields: ESTA CODE, ESTA NAME, RRC NO, RRC DATE
- Optional fields: RO, IR NIR, PERIOD, address fields, contact info
- Financial fields (all calculated automatically)
- RRC-level totals (grouped by ESTA CODE)
- Unique constraint: RRC NO per office

### API Endpoints:
- `POST /api/rrc/upload` - Upload RRC Excel file
- `GET /api/rrc/template` - Download RRC template
- `GET /api/rrc` - Get all RRCs for office

### Validation:
- **Mandatory columns:** ESTA CODE, ESTA NAME, RRC NO, RRC DATE
- **Optional columns:** RO, IR NIR, PERIOD, ADD1-3, CITY, PIN Cd, MOBILE NO, EMAIL, DEMAND fields
- **Row-level validation:** Validates each row for required fields and data types
- **Rejects entire file** if any validation error

### Financial Calculations:
- DEMAND TOTAL = DEMAND 7A + DEMAND 14B + DEMAND 7Q
- RECOVERY TOTAL = RECOVERY 7A + RECOVERY 14B + RECOVERY 7Q
- OUTSTAND fields = DEMAND - RECOVERY
- OUTSTAND REC COST = RECOVERY COST - RECEVIED REC COST
- OUTSTAND TOT WITH REC = OUTSTAND TOTAL + OUTSTAND REC COST
- **RRC-level totals:** Calculated per ESTA CODE

## 🏢 Establishment Module

### Model Features:
- Office isolation via `regional_office_code`
- Mandatory fields: ESTA CODE, ESTA NAME
- Optional fields: RO, IR NIR, address, contact info
- Updates existing establishments (upsert by ESTA CODE)

### API Endpoints:
- `POST /api/establishment/upload` - Upload Establishment Excel
- `GET /api/establishment/template` - Download template
- `GET /api/establishment` - Get all establishments for office

### Validation:
- **Mandatory columns:** ESTA CODE, ESTA NAME
- **Rejects file** if validation fails

## 🔍 Excel Services

### Excel Validator Service:
- `validateRRCColumns()` - Validates RRC Excel structure
- `validateEstablishmentColumns()` - Validates Establishment Excel
- Returns detailed error messages with missing columns

### Excel Parser Service:
- `parseExcelFile()` - Parses Excel buffer to JSON
- `parseAndValidateExcel()` - Parse with validation
- `cleanExcelData()` - Cleans and normalizes data

### Finance Calculator Service:
- `calculateAllFinancialFields()` - Calculates all financial fields
- `calculateRRCTotals()` - Groups and calculates RRC-level totals
- `applyRRCTotals()` - Applies totals to rows

## 📥 File Upload

### Upload Middleware:
- Accepts only Excel files (.xlsx, .xls)
- 10MB file size limit
- Stores file in memory (buffer)
- Validates file type

## 📋 Excel Templates

### RRC Template:
- Download: `GET /api/rrc/template`
- Includes mandatory columns with example data
- Shows optional columns

### Establishment Template:
- Download: `GET /api/establishment/template`
- Includes mandatory columns
- Shows optional fields

## 🎯 Key Features

1. **Strict Validation:**
   - Rejects entire file on any error
   - Clear error messages
   - Missing column names in response
   - Template link in error response

2. **Financial Calculations:**
   - All calculated automatically
   - RRC-level totals per ESTA CODE
   - Updates totals when RRCs change

3. **Data Isolation:**
   - All data tied to `regional_office_code`
   - Office-specific queries

4. **Upsert Logic:**
   - RRC: Updates if RRC NO exists
   - Establishment: Updates if ESTA CODE exists

## 📝 API Usage Examples

### Upload RRC Excel:
```bash
POST /api/rrc/upload
Content-Type: multipart/form-data
Body:
  - excelFile: <file>
  - regional_office_code: PUPUN
```

### Download RRC Template:
```bash
GET /api/rrc/template
```

### Get RRCs:
```bash
GET /api/rrc?regional_office_code=PUPUN
```

## ✅ Phase-2 Goals Achieved

- [x] RRC Excel upload with strict validation
- [x] Establishment Excel upload
- [x] Excel template download
- [x] Financial calculations (automatic)
- [x] RRC-level totals (grouped by ESTA CODE)
- [x] Data isolation per office
- [x] Error handling with clear messages
- [x] Professional, modular structure

## 🚀 Next Steps

1. **Install dependencies:**
   ```bash
   cd backend
   npm install
   ```

2. **Restart backend server:**
   ```bash
   npm start
   ```

3. **Test endpoints:**
   - Download templates
   - Upload Excel files
   - Verify calculations

---

**Status**: Phase-2 backend implementation complete and ready for testing.

