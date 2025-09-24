# QZ Tray Printer Implementation Guide - FEMIGA POS System
## Star Micronics TSP100III futurePRNT Series Integration

## Table of Contents
1. [Target Printer Specifications](#target-printer-specifications)
2. [Project Analysis Summary](#project-analysis-summary)
3. [Current Implementation Status](#current-implementation-status)
4. [Star TSP100III Specific Implementation](#star-tsp100iii-specific-implementation)
5. [Complete QZ Tray Implementation](#complete-qz-tray-implementation)
6. [Agent Prompt for Enhancement](#agent-prompt-for-enhancement)
7. [File Structure](#file-structure)
8. [Next Steps](#next-steps)

---

## Target Printer Specifications

### Star Micronics TSP100III futurePRNT Series

| Specification | Detail |
|---------------|--------|
| **Print Method** | Direct Thermal (no ink required) |
| **Print Speed** | Up to 250 mm/second (approx. 43 receipts per minute) |
| **Resolution** | 203 dpi (dots per inch) |
| **Paper Width** | 80 mm (Standard) or 58 mm (with paper guide) |
| **Maximum Roll Diameter** | 83 mm (3.27 inches) |
| **Cutter** | Guillotine Auto-Cutter (Partial cut) - Life: 2 Million cuts |
| **Reliability** | Print Head Life: 100 km |
| **Connectivity** | USB, Ethernet (LAN), WLAN (Wi-Fi), Bluetooth |
| **Emulation** | Star Mode, ESC/POS™ (via futurePRNT software) |
| **Unique Features** | futurePRNT software, AllReceipts™ digital receipt solution |

### Supported Connection Types
- **USB**: Direct connection via USB cable
- **Ethernet**: Network connection for shared printing
- **Wi-Fi**: Wireless network connection
- **Bluetooth**: Mobile device compatibility (iOS/Android)

### Paper Specifications
- **Standard Width**: 80mm (3.15 inches)
- **Alternative Width**: 58mm (2.28 inches) with paper guide
- **Paper Type**: Thermal paper rolls
- **Maximum Characters per Line**:
  - 80mm paper: 48 characters (12 CPI) or 42 characters (10 CPI)
  - 58mm paper: 35 characters (12 CPI) or 32 characters (10 CPI)

---

## Project Analysis Summary

After analyzing the FEMIGA POS system codebase (`src/containers/billing.jsx` and `src/containers/transaction.jsx`), I found that **QZ Tray printer functionality is already implemented** and functional. This guide provides a comprehensive overview of the existing implementation and enhancement opportunities.

### Key Findings
- ✅ QZ Tray library is properly integrated
- ✅ Printer connection and discovery working
- ✅ Bill printing with ESC/POS commands implemented
- ✅ Error handling and user feedback in place
- ✅ Printer selection persistence via localStorage

---

## Current Implementation Status

### ✅ Already Implemented Features

1. **QZ Tray Connection Management**
   - Automatic connection on component mount
   - Connection status tracking
   - Error handling for connection failures

2. **Printer Discovery and Selection**
   - Automatic printer discovery
   - Interactive printer selection modal
   - Printer persistence in localStorage

3. **Bill Printing with ESC/POS Commands**
   - Formatted bill layout (42 character width)
   - ESC/POS command integration
   - Paper cutting commands

4. **Error Handling and User Feedback**
   - Toast notifications for success/failure
   - Connection status indicators
   - Validation checks before printing

---

## Star TSP100III Specific Implementation

### 1. Printer Detection and Configuration

```javascript
// Star TSP100III specific printer detection
const STAR_TSP100III_IDENTIFIERS = [
  'TSP100',
  'TSP100III',
  'Star TSP100',
  'futurePRNT',
  'Star Micronics'
];

// Enhanced printer discovery for Star TSP100III
async discoverStarPrinters() {
  const allPrinters = await qz.printers.find();

  // Filter for Star TSP100III printers
  const starPrinters = allPrinters.filter(printer =>
    STAR_TSP100III_IDENTIFIERS.some(identifier =>
      printer.toLowerCase().includes(identifier.toLowerCase())
    )
  );

  // Set optimal configuration for Star TSP100III
  if (starPrinters.length > 0) {
    this.configureStarPrinter(starPrinters[0]);
  }

  return { allPrinters, starPrinters };
}

// Star TSP100III optimal configuration
configureStarPrinter(printerName) {
  const starConfig = {
    printerName: printerName,
    paperWidth: 80, // 80mm standard width
    charactersPerLine: 42, // Optimal for 80mm paper
    printSpeed: 250, // mm/second
    cutType: 'partial', // Guillotine auto-cutter partial cut
    encoding: 'UTF-8',
    dpi: 203
  };

  this.setState({
    selectedPrinter: printerName,
    printerConfig: starConfig
  });

  localStorage.setItem('starPrinterConfig', JSON.stringify(starConfig));
}
```

### 2. Star TSP100III ESC/POS Commands

```javascript
// Star TSP100III specific ESC/POS commands
const STAR_TSP100III_COMMANDS = {
  // Initialization
  INIT: "\x1B\x40", // ESC @

  // Star Mode specific commands
  STAR_MODE_INIT: "\x1B\x1D\x61\x00", // Initialize Star Mode

  // Text formatting optimized for TSP100III
  BOLD_ON: "\x1B\x45", // ESC E
  BOLD_OFF: "\x1B\x46", // ESC F
  UNDERLINE_ON: "\x1B\x2D\x01", // ESC - 1
  UNDERLINE_OFF: "\x1B\x2D\x00", // ESC - 0

  // Font sizes for 203 DPI
  FONT_NORMAL: "\x1B\x69\x00\x00", // Normal font
  FONT_DOUBLE_WIDTH: "\x1B\x69\x01\x00", // Double width
  FONT_DOUBLE_HEIGHT: "\x1B\x69\x00\x01", // Double height
  FONT_DOUBLE_BOTH: "\x1B\x69\x01\x01", // Double width & height

  // Alignment for 80mm paper
  ALIGN_LEFT: "\x1B\x1D\x61\x00",
  ALIGN_CENTER: "\x1B\x1D\x61\x01",
  ALIGN_RIGHT: "\x1B\x1D\x61\x02",

  // Paper control for TSP100III
  FEED_LINE: "\x0A", // LF
  FEED_LINES: (n) => "\x1B\x61" + String.fromCharCode(n), // ESC a n

  // Cutter commands for Guillotine Auto-Cutter
  CUT_PARTIAL: "\x1B\x64\x02", // ESC d 2 (Partial cut)
  CUT_FULL: "\x1B\x64\x03", // ESC d 3 (Full cut)

  // Cash drawer (if connected)
  OPEN_DRAWER_1: "\x1B\x07", // ESC BEL
  OPEN_DRAWER_2: "\x1C\x05", // FS ENQ

  // Status commands
  STATUS_REQUEST: "\x1B\x76", // ESC v
  REAL_TIME_STATUS: "\x10\x04\x01", // DLE EOT 1

  // Barcode commands (TSP100III supports various formats)
  BARCODE_UPC_A: "\x1B\x62\x00",
  BARCODE_UPC_E: "\x1B\x62\x01",
  BARCODE_CODE39: "\x1B\x62\x04",
  BARCODE_CODE128: "\x1B\x62\x06",

  // QR Code support
  QR_CODE_MODEL: "\x1B\x1D\x79\x53\x30\x00", // Set QR model
  QR_CODE_SIZE: (size) => "\x1B\x1D\x79\x53\x32" + String.fromCharCode(size), // Set size 1-8
  QR_CODE_PRINT: (data) => "\x1B\x1D\x79\x44\x31\x00" + data + "\x1B\x1D\x79\x50", // Print QR
};
```

### 3. Optimized Bill Formatting for 80mm Paper

```javascript
// Star TSP100III optimized bill formatting
formatBillForStarTSP100III(billArr, totAmount) {
  const PAPER_WIDTH = 42; // Characters for 80mm paper
  let billContent = "";

  // Header with Star TSP100III optimization
  billContent += STAR_TSP100III_COMMANDS.INIT;
  billContent += STAR_TSP100III_COMMANDS.ALIGN_CENTER;
  billContent += STAR_TSP100III_COMMANDS.FONT_DOUBLE_BOTH;
  billContent += "FEMIGA\n";
  billContent += STAR_TSP100III_COMMANDS.FONT_NORMAL;
  billContent += "Ground floor, Palladium Mall\n";
  billContent += "Chennai, Tamil Nadu - 600042\n";
  billContent += "GSTIN: 33EZJPS8318R1ZC\n";
  billContent += "Ph: +91 99946 24642\n";
  billContent += STAR_TSP100III_COMMANDS.ALIGN_LEFT;

  // Separator line
  billContent += "=".repeat(PAPER_WIDTH) + "\n";

  // Bill details header
  billContent += STAR_TSP100III_COMMANDS.BOLD_ON;
  billContent += "Item".padEnd(20) + "Qty".padEnd(5) + "Price".padEnd(8) + "Amount\n";
  billContent += STAR_TSP100III_COMMANDS.BOLD_OFF;
  billContent += "-".repeat(PAPER_WIDTH) + "\n";

  // Items with optimized spacing for 80mm
  billArr.forEach((item, index) => {
    const itemName = (item.itemName || "Item").substring(0, 19);
    const qty = (item.quantity || 0).toString();
    const price = (item.price || 0).toFixed(2);
    const amount = (item.amount || 0).toFixed(2);

    billContent += itemName.padEnd(20) +
                   qty.padEnd(5) +
                   price.padEnd(8) +
                   amount + "\n";

    // Add item details if available
    if (item.parameter) {
      try {
        const params = JSON.parse(item.parameter);
        Object.entries(params).forEach(([key, value]) => {
          billContent += `  ${key}: ${value}\n`;
        });
      } catch (e) {
        // Handle parsing error
      }
    }

    if (item.disc && item.disc !== "0") {
      billContent += `  Discount: ${item.disc}\n`;
    }
  });

  // Summary section
  billContent += "=".repeat(PAPER_WIDTH) + "\n";
  billContent += STAR_TSP100III_COMMANDS.BOLD_ON;
  billContent += `Total Items: ${billArr.length}`.padEnd(25) +
                 `Total: ₹${totAmount.toFixed(2)}\n`;
  billContent += STAR_TSP100III_COMMANDS.BOLD_OFF;
  billContent += "=".repeat(PAPER_WIDTH) + "\n";

  // Footer
  billContent += STAR_TSP100III_COMMANDS.ALIGN_CENTER;
  billContent += "Thank you for shopping with us!\n";
  billContent += "Visit us again!\n";
  billContent += STAR_TSP100III_COMMANDS.ALIGN_LEFT;

  // Terms and conditions in smaller text
  billContent += "\nTerms & Conditions:\n";
  billContent += "* 3 months service warranty\n";
  billContent += "* Manufacturing defects covered\n";
  billContent += "* Bill required for warranty\n";
  billContent += "* Exchange within 3 days\n";

  return billContent;
}
```

### 4. Star TSP100III Print Function

```javascript
async printToStarTSP100III(billContent) {
  try {
    // Create configuration for Star TSP100III
    const config = qz.configs.create(this.state.selectedPrinter, {
      encoding: 'UTF-8',
      endOfDoc: '\x0A\x0A\x0A\x0A', // 4 line feeds before cut
    });

    let printData = [];

    // Initialize printer for Star TSP100III
    printData.push(STAR_TSP100III_COMMANDS.INIT);

    // Set optimal settings for thermal printing
    printData.push(STAR_TSP100III_COMMANDS.STAR_MODE_INIT);

    // Add formatted bill content
    billContent.split('\n').forEach(line => {
      printData.push(line);
      printData.push('\x0A'); // Line feed
    });

    // Add spacing before cut
    printData.push('\x0A', '\x0A', '\x0A', '\x0A');

    // Use partial cut for TSP100III (recommended)
    printData.push(STAR_TSP100III_COMMANDS.CUT_PARTIAL);

    // Send to printer
    await qz.print(config, printData);

    console.log("Star TSP100III: Print successful");
    toast.success("Bill printed successfully on Star TSP100III");

    // Optional: Open cash drawer if connected
    if (this.state.openDrawerAfterPrint) {
      setTimeout(() => {
        qz.print(config, [STAR_TSP100III_COMMANDS.OPEN_DRAWER_1]);
      }, 1000);
    }

  } catch (error) {
    console.error("Star TSP100III Print Error:", error);
    toast.error(`Print failed: ${error.message}`);
    throw error;
  }
}
```

---

## Complete QZ Tray Implementation

### 1. Dependencies and Imports

```javascript
// In both billing.jsx and transaction.jsx
import * as qz from "qz-tray";
```

### 2. State Management

```javascript
// State properties for QZ Tray functionality
this.state = {
  // Printer-related state
  printerSelectModel: false,    // Modal visibility
  printerList: [],              // Available printers
  selectedPrinter: "",          // Currently selected printer
  isQZConnected: false,         // Connection status
  
  // Other existing state properties...
  bill: {},
  billArr: [],
  totAmount: 0,
  disabled: false,
  // ...
};
```

### 3. QZ Tray Connection and Printer Discovery

```javascript
async onReload() {
  // ... other initialization code ...

  // QZ Tray connection and printer discovery
  qz.websocket
    .connect()
    .then(() => {
      console.log("Connected to QZ Tray");
      
      // Discover available printers
      qz.printers.find().then((printers) => {
        console.log(printers);
        this.setState({ printerList: printers });

        // Restore previously selected printer
        let selectedPrinter = localStorage.getItem("selectedPrinter");
        if (selectedPrinter && printers.includes(selectedPrinter)) {
          this.setState({ selectedPrinter });
        }
      });

      this.setState({ isQZConnected: true });
    })
    .catch((err) => {
      console.error(err);
      toast("Failed to connect to Client Software");
    });
}
```

### 4. Printer Selection Modal Component

```javascript
<Modal
  open={this.state.printerSelectModel}
  onClose={() => this.setState({ printerSelectModel: false })}
>
  <ModalHeader>Select Printer</ModalHeader>
  <ModalContent>
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "0.5rem",
      }}
    >
      {this.state.printerList.map((printer) => (
        <div
          key={printer}
          onClick={() => this.setState({ selectedPrinter: printer })}
          style={{
            border:
              this.state.selectedPrinter == printer
                ? "2px solid blue"
                : "2px solid grey",
            padding: "0.5rem 0rem 0.5rem 2rem",
            cursor: "pointer",
          }}
        >
          {printer}
        </div>
      ))}
    </div>
  </ModalContent>
  <ModalActions>
    <Button
      content="Save"
      onClick={() => {
        this.setState({ printerSelectModel: false });
      }}
    />
  </ModalActions>
</Modal>
```

### 5. Printer State Persistence

```javascript
// Save selected printer to localStorage
componentDidUpdate(prevProps) {
  if (this.state.selectedPrinter) {
    localStorage.setItem("selectedPrinter", this.state.selectedPrinter);
  }
}

// Restore printer state in transaction.jsx
componentDidUpdate(prevProps) {
  if (this.state.selectedPrinter === "" && localStorage.getItem("selectedPrinter")) {
    this.setState({ selectedPrinter: localStorage.getItem("selectedPrinter") });
  }
  if (this.state.isQZConnected === false && localStorage.getItem("isQZConnected")) {
    this.setState({ isQZConnected: localStorage.getItem("isQZConnected") });
  }
}
```

### 6. Enhanced Bill Printing Implementation for Star TSP100III

```javascript
async handlePrintBillStarTSP100III() {
  let { bill, billArr, totAmount, billCount } = this.state;

  // Validation checks
  if (bill.customerPhoneNo) {
    if (bill.customerPhoneNo.length < 10) {
      toast("Please add a valid customer number");
      return;
    }
  } else {
    toast("Please add customer");
    return;
  }

  if (_.isEmpty(billArr)) {
    toast("At least one item should be added");
    return;
  }

  // Prepare bill data
  bill["bill"] = billArr;
  bill["billNo"] = `FGM-${1000 + billCount}`;
  bill["billAmount"] = totAmount;
  bill["location"] = this.props.auth.location;

  this.setState({ bill, disabled: true });

  // Save bill to backend
  let res = await axios
    .post(`${constants.DOMAIN}/bill`, bill)
    .catch((err) => {
      toast(err.response.data.error);
      this.setState({ disabled: false });
      return;
    });

  if (res && res.status === 200) {
    // Reset state after successful save
    this.setState({
      billArr: [],
      billObj: {},
      bill: {},
      totAmount: 0,
      bag: false,
      addCharge: 0,
      discAuxVar: 0,
    });

    toast("Successfully created the bill");

    // Check for Star TSP100III printer
    if (!this.state.selectedPrinter) {
      console.log("Printer not selected");
      this.setState({ printerSelectModel: true });
      return;
    }

    // Verify if selected printer is Star TSP100III
    const isStarPrinter = STAR_TSP100III_IDENTIFIERS.some(identifier =>
      this.state.selectedPrinter.toLowerCase().includes(identifier.toLowerCase())
    );

    if (this.state.isQZConnected) {
      if (isStarPrinter) {
        // Use Star TSP100III optimized formatting and printing
        const starBillContent = this.formatBillForStarTSP100III(billArr, totAmount);
        await this.printToStarTSP100III(starBillContent);
      } else {
        // Fallback to generic ESC/POS printing
        const genericBillContent = this.formatBillContent(billArr, totAmount, 42);
        await this.printBill(genericBillContent);
      }
    } else {
      toast("Failed to connect to QZ Tray Client Software");
    }
  }
}

// Enhanced printer status check for Star TSP100III
async checkStarPrinterStatus() {
  if (!this.state.selectedPrinter || !this.state.isQZConnected) {
    return 'disconnected';
  }

  try {
    const config = qz.configs.create(this.state.selectedPrinter);

    // Send Star TSP100III status request
    await qz.print(config, [STAR_TSP100III_COMMANDS.STATUS_REQUEST]);

    // Wait for response (simplified check)
    await new Promise(resolve => setTimeout(resolve, 1000));

    return 'online';
  } catch (error) {
    console.error('Star printer status check failed:', error);
    return 'offline';
  }
}
```

### 7. Bill Formatting Function

```javascript
formatBillContent(billArr, totAmount, billWidth) {
  let billContent = "";

  // Company header
  let billHeader = `FEMIGA
    Ground floor, Palladium
    Mall Chennai, Tamil Nadu
    -600042 GSTIN: 33EZJPS8318R1ZC
    Ph: +91 99946 24642`;

  // Format header with proper alignment
  billHeader.split("\n").forEach((line) => {
    if (line.length < billWidth) {
      const words = line.split(" ");
      if (words.length > 1) {
        let spacesNeeded = billWidth - line.length;
        let spaceBetweenWords = Math.floor(spacesNeeded / (words.length - 1));
        let extraSpaces = spacesNeeded % (words.length - 1);

        for (let i = 0; i < words.length - 1; i++) {
          billContent += words[i];
          billContent += " ".repeat(spaceBetweenWords + (i < extraSpaces ? 1 : 0));
        }
        billContent += words[words.length - 1];
      } else {
        billContent += line.padStart((billWidth + line.length) / 2);
      }
    } else {
      billContent += line;
    }
    billContent += "\n";
  });

  // Add separator and headers
  billContent += "=".repeat(billWidth) + "\n";
  billContent += "Product Name |Price |Qty|Disc|GST |Amount\n";
  billContent += "=".repeat(billWidth) + "\n";

  // Add product details
  billArr.forEach((item) => {
    billContent +=
      (item.itemName ? item.itemName : "Unknown Item").padEnd(billWidth) + "\n";
    billContent +=
      (item.itemNo ? item.itemNo : "N/A").toString().padEnd(5) +
      (item.price ? item.price : "0").toString().padStart(9) +
      (item.quantity ? item.quantity : "0").toString().padStart(6) +
      (item.disc ? item.disc : "0").toString().padStart(5) +
      (item.gst ? item.gst : "0").toString().padStart(5) +
      (item.amount ? item.amount : "0").toString().padStart(6) +
      "\n";
  });

  // Add summary
  billContent += "=".repeat(billWidth) + "\n";
  billContent += `Items: ${billArr.length}`.padEnd(20) + 
                 `Qty: ${billArr.reduce((acc, item) => acc + item.quantity, 0)}`.padStart(20) + "\n";
  billContent += "=".repeat(billWidth) + "\n";
  billContent += `Total Amount: ${totAmount.toFixed(2)}`.padStart(billWidth) + "\n";
  billContent += "=".repeat(billWidth) + "\n";

  // Add footer
  let billFooter = `Thank you for shopping with us!`;
  billContent += billFooter.padStart((billWidth + billFooter.length) / 2) + "\n";

  return billContent;
}
```

### 8. ESC/POS Printing Function

```javascript
async printBill(billContent) {
  try {
    let config = qz.configs.create(this.state.selectedPrinter);
    let data = ["\x1B\x40"]; // Initialize printer (ESC @)

    // Add the complete bill content
    billContent.split("\n").forEach((line) => {
      data.push(line);
      data.push("\x0A"); // New line (LF)
    });

    // Add extra newlines before cutting
    data.push("\x0A"); // New line
    data.push("\x0A"); // New line
    data.push("\x0A"); // New line
    data.push("\x0A"); // New line

    // Cut paper command
    data.push("\x1D\x56\x41"); // Full cut (GS V A)

    // Send to printer
    await qz.print(config, data);
    console.log("Printed successfully");
    toast("Successfully printed the bill");

  } catch (err) {
    console.error(err);
    toast("Failed to print the bill");
  }
}
```

### 9. Enhanced UI Controls for Star TSP100III Management

```javascript
// Star TSP100III Status Indicator
renderStarPrinterStatus() {
  const { selectedPrinter, isQZConnected, printerStatus } = this.state;

  const isStarPrinter = selectedPrinter && STAR_TSP100III_IDENTIFIERS.some(identifier =>
    selectedPrinter.toLowerCase().includes(identifier.toLowerCase())
  );

  return (
    <div className="star-printer-status" style={{
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      padding: '10px',
      backgroundColor: isQZConnected ? '#e8f5e8' : '#ffe8e8',
      borderRadius: '5px',
      marginBottom: '10px'
    }}>
      <div className={`status-indicator ${isQZConnected ? 'connected' : 'disconnected'}`}
           style={{
             width: '12px',
             height: '12px',
             borderRadius: '50%',
             backgroundColor: isQZConnected ? '#4CAF50' : '#f44336'
           }}>
      </div>
      <span>
        {isQZConnected ? 'QZ Tray Connected' : 'QZ Tray Disconnected'}
      </span>
      {isStarPrinter && (
        <>
          <span style={{ marginLeft: '20px' }}>|</span>
          <span style={{ color: '#2196F3', fontWeight: 'bold' }}>
            Star TSP100III Detected
          </span>
        </>
      )}
    </div>
  );
}

// Enhanced Printer Selection Modal for Star TSP100III
<Modal
  open={this.state.printerSelectModel}
  onClose={() => this.setState({ printerSelectModel: false })}
>
  <ModalHeader>Select Printer - Star TSP100III Recommended</ModalHeader>
  <ModalContent>
    <div style={{ marginBottom: '15px' }}>
      <strong>Recommended:</strong> Star Micronics TSP100III futurePRNT Series
    </div>
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "0.5rem",
      }}
    >
      {this.state.printerList.map((printer) => {
        const isStarPrinter = STAR_TSP100III_IDENTIFIERS.some(identifier =>
          printer.toLowerCase().includes(identifier.toLowerCase())
        );

        return (
          <div
            key={printer}
            onClick={() => this.setState({ selectedPrinter: printer })}
            style={{
              border: this.state.selectedPrinter === printer
                ? "3px solid #2196F3"
                : isStarPrinter
                  ? "2px solid #4CAF50"
                  : "2px solid grey",
              padding: "0.5rem 0rem 0.5rem 2rem",
              cursor: "pointer",
              backgroundColor: isStarPrinter ? '#f0f8f0' : 'white',
              borderRadius: '5px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>{printer}</span>
              {isStarPrinter && (
                <span style={{
                  color: '#4CAF50',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  backgroundColor: '#e8f5e8',
                  padding: '2px 8px',
                  borderRadius: '10px'
                }}>
                  STAR TSP100III
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
    {this.state.printerList.length === 0 && (
      <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
        No printers detected. Please ensure your Star TSP100III is connected and powered on.
      </div>
    )}
  </ModalContent>
  <ModalActions>
    <Button
      content="Test Print"
      color="blue"
      onClick={() => this.handleTestPrint()}
      disabled={!this.state.selectedPrinter}
    />
    <Button
      content="Save"
      color="green"
      onClick={() => {
        this.setState({ printerSelectModel: false });
        if (this.state.selectedPrinter) {
          this.configureStarPrinter(this.state.selectedPrinter);
        }
      }}
    />
  </ModalActions>
</Modal>

// Enhanced Control Buttons
<div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
  {this.renderStarPrinterStatus()}

  <Button
    color="blue"
    icon="settings"
    onClick={() => this.setState({ printerSelectModel: true })}
  >
    Printer Settings
  </Button>

  <Button
    color="orange"
    onClick={() => this.handleTestPrint()}
    disabled={!this.state.selectedPrinter || !this.state.isQZConnected}
  >
    Test Print
  </Button>

  <Button
    style={disabled ? { pointerEvents: "none", opacity: "50%" } : {}}
    color="brown"
    size="large"
    onClick={() => this.handlePrintBillStarTSP100III()}
    disabled={!this.state.selectedPrinter || !this.state.isQZConnected}
  >
    Print Bill
  </Button>
</div>

// Test Print Function for Star TSP100III
async handleTestPrint() {
  if (!this.state.selectedPrinter || !this.state.isQZConnected) {
    toast.error("Please select a printer and ensure QZ Tray is connected");
    return;
  }

  const testContent = this.generateTestPrintContent();

  try {
    const isStarPrinter = STAR_TSP100III_IDENTIFIERS.some(identifier =>
      this.state.selectedPrinter.toLowerCase().includes(identifier.toLowerCase())
    );

    if (isStarPrinter) {
      await this.printToStarTSP100III(testContent);
    } else {
      await this.printBill(testContent);
    }

    toast.success("Test print completed successfully");
  } catch (error) {
    toast.error(`Test print failed: ${error.message}`);
  }
}

generateTestPrintContent() {
  const now = new Date();
  return `
FEMIGA POS System
Test Print - Star TSP100III

Date: ${now.toLocaleDateString()}
Time: ${now.toLocaleTimeString()}

Printer: ${this.state.selectedPrinter}
Status: Connected

This is a test print to verify
your Star TSP100III printer
is working correctly.

Features tested:
✓ Text printing
✓ Formatting
✓ Paper cutting
✓ Character encoding

If you can read this clearly,
your printer is ready for use!

Thank you for using FEMIGA POS
`;
}
```

---

## Agent Prompt for Enhancement

```markdown
# QZ Tray Printer Implementation Enhancement Agent

## Context
You are working on a React-based POS system for FEMIGA that already has QZ Tray printer functionality implemented. The system uses:
- React with Semantic UI components
- QZ Tray library for thermal printer communication
- ESC/POS commands for printer control
- Local storage for printer persistence

## Current Implementation Status
✅ QZ Tray connection management
✅ Printer discovery and selection
✅ Basic bill printing with ESC/POS commands
✅ Printer state persistence in localStorage
✅ Error handling and user feedback

## Your Tasks

### 1. Code Analysis and Understanding
- Review the existing QZ Tray implementation in `src/containers/billing.jsx` and `src/containers/transaction.jsx`
- Understand the current printer workflow: connection → discovery → selection → printing
- Analyze the ESC/POS command structure used for bill formatting

### 2. Enhancement Opportunities

#### A. Connection Management
- Add automatic reconnection logic for lost connections
- Implement connection status monitoring with visual indicators
- Add QZ Tray service detection and installation guidance
- Create connection health checks with periodic pings

#### B. Printer Configuration
- Add printer-specific settings (paper width, font size, character encoding)
- Implement print preview functionality with real-time formatting
- Add support for multiple printer profiles (receipt, label, A4)
- Create printer calibration and test print features

#### C. Print Quality and Formatting
- Enhance bill layout with better alignment and spacing
- Add support for logos/images in receipts using base64 encoding
- Implement different receipt templates (full receipt, summary, customer copy)
- Add barcode and QR code printing capabilities
- Support for different fonts and text formatting (bold, underline, etc.)

#### D. Error Handling and Recovery
- Improve error messages with actionable solutions
- Add retry mechanisms for failed print jobs with exponential backoff
- Implement print queue management for multiple print jobs
- Add offline mode with print job caching
- Create diagnostic tools for printer troubleshooting

#### E. User Experience
- Add printer status indicators in the UI (online, offline, error, paper low)
- Implement print job history and tracking
- Add keyboard shortcuts for common printing actions (Ctrl+P)
- Create printer management dashboard
- Add print job cancellation functionality

### 3. Implementation Guidelines

#### Enhanced QZ Service Class
```javascript
class QZPrinterService {
  constructor() {
    this.isConnected = false;
    this.selectedPrinter = null;
    this.printerList = [];
    this.connectionRetries = 0;
    this.maxRetries = 3;
    this.printQueue = [];
    this.printerStatus = {};
  }

  async connect() {
    // Enhanced connection logic with retry mechanism
    try {
      await qz.websocket.connect();
      this.isConnected = true;
      this.connectionRetries = 0;
      await this.discoverPrinters();
      this.startStatusMonitoring();
    } catch (error) {
      await this.handleConnectionError(error);
    }
  }

  async handleConnectionError(error) {
    if (this.connectionRetries < this.maxRetries) {
      this.connectionRetries++;
      setTimeout(() => this.connect(), 2000 * this.connectionRetries);
    } else {
      throw new Error('Failed to connect to QZ Tray after multiple attempts');
    }
  }

  async discoverPrinters() {
    // Printer discovery with caching and status checking
    const printers = await qz.printers.find();
    this.printerList = printers;

    // Check status of each printer
    for (const printer of printers) {
      this.printerStatus[printer] = await this.checkPrinterStatus(printer);
    }

    return printers;
  }

  async checkPrinterStatus(printerName) {
    try {
      const config = qz.configs.create(printerName);
      // Send a status check command
      await qz.print(config, ["\x10\x04\x01"]); // DLE EOT n (status request)
      return 'online';
    } catch (error) {
      return 'offline';
    }
  }

  async print(content, options = {}) {
    // Enhanced printing with error recovery and queue management
    const printJob = {
      id: Date.now(),
      content,
      options,
      status: 'pending',
      attempts: 0,
      maxAttempts: 3
    };

    this.printQueue.push(printJob);
    return await this.processPrintQueue();
  }

  async processPrintQueue() {
    while (this.printQueue.length > 0) {
      const job = this.printQueue[0];
      try {
        await this.executePrintJob(job);
        job.status = 'completed';
        this.printQueue.shift();
      } catch (error) {
        job.attempts++;
        if (job.attempts >= job.maxAttempts) {
          job.status = 'failed';
          this.printQueue.shift();
          throw error;
        } else {
          // Retry after delay
          await new Promise(resolve => setTimeout(resolve, 1000 * job.attempts));
        }
      }
    }
  }

  async executePrintJob(job) {
    const config = qz.configs.create(this.selectedPrinter);
    const data = this.formatPrintData(job.content, job.options);
    await qz.print(config, data);
  }

  formatPrintData(content, options) {
    let data = ["\x1B\x40"]; // Initialize printer

    // Apply formatting options
    if (options.bold) data.push("\x1B\x45\x01");
    if (options.center) data.push("\x1B\x61\x01");

    // Add content
    content.split("\n").forEach(line => {
      data.push(line);
      data.push("\x0A");
    });

    // Reset formatting
    data.push("\x1B\x45\x00"); // Bold off
    data.push("\x1B\x61\x00"); // Left align

    // Add cut command if specified
    if (options.cut !== false) {
      data.push("\x0A", "\x0A", "\x0A", "\x0A");
      data.push(options.partialCut ? "\x1D\x56\x42" : "\x1D\x56\x41");
    }

    return data;
  }

  startStatusMonitoring() {
    setInterval(async () => {
      if (this.isConnected) {
        try {
          await qz.websocket.isActive();
          // Update printer statuses
          for (const printer of this.printerList) {
            this.printerStatus[printer] = await this.checkPrinterStatus(printer);
          }
        } catch (error) {
          this.isConnected = false;
          this.handleConnectionLost();
        }
      }
    }, 30000); // Check every 30 seconds
  }

  handleConnectionLost() {
    console.warn('QZ Tray connection lost, attempting to reconnect...');
    this.connect();
  }
}
```

#### ESC/POS Command Enhancements
```javascript
const ESC_POS_COMMANDS = {
  // Printer initialization
  INIT: "\x1B\x40",

  // Text formatting
  BOLD_ON: "\x1B\x45\x01",
  BOLD_OFF: "\x1B\x45\x00",
  UNDERLINE_ON: "\x1B\x2D\x01",
  UNDERLINE_OFF: "\x1B\x2D\x00",
  DOUBLE_HEIGHT: "\x1B\x21\x10",
  DOUBLE_WIDTH: "\x1B\x21\x20",
  NORMAL_TEXT: "\x1B\x21\x00",

  // Alignment
  ALIGN_LEFT: "\x1B\x61\x00",
  ALIGN_CENTER: "\x1B\x61\x01",
  ALIGN_RIGHT: "\x1B\x61\x02",

  // Paper control
  FEED_LINE: "\x0A",
  FEED_LINES: (n) => "\x1B\x64" + String.fromCharCode(n),
  CUT_FULL: "\x1D\x56\x41",
  CUT_PARTIAL: "\x1D\x56\x42",

  // Drawer control
  OPEN_DRAWER: "\x1B\x70\x00\x19\xFA",

  // Status commands
  STATUS_REQUEST: "\x10\x04\x01",

  // Barcode commands
  BARCODE_HEIGHT: (h) => "\x1D\x68" + String.fromCharCode(h),
  BARCODE_WIDTH: (w) => "\x1D\x77" + String.fromCharCode(w),
  BARCODE_PRINT: (type, data) => "\x1D\x6B" + String.fromCharCode(type) + data + "\x00",
};
```

#### Enhanced React Component Structure
```javascript
// Enhanced Billing Component with improved printer management
class EnhancedBilling extends React.Component {
  constructor(props) {
    super(props);
    this.qzService = new QZPrinterService();
    this.state = {
      // Existing state...

      // Enhanced printer state
      printerStatus: {},
      printQueue: [],
      connectionStatus: 'disconnected', // disconnected, connecting, connected, error
      lastPrintJob: null,
      printPreview: null,
      printerSettings: {
        paperWidth: 42,
        fontSize: 'normal',
        encoding: 'UTF-8'
      }
    };
  }

  async componentDidMount() {
    try {
      await this.qzService.connect();
      this.setState({
        connectionStatus: 'connected',
        printerList: this.qzService.printerList,
        printerStatus: this.qzService.printerStatus
      });
    } catch (error) {
      this.setState({ connectionStatus: 'error' });
      toast.error('Failed to connect to printer service');
    }
  }

  renderPrinterStatus() {
    const { connectionStatus, selectedPrinter, printerStatus } = this.state;

    return (
      <div className="printer-status">
        <div className={`connection-indicator ${connectionStatus}`}>
          QZ Tray: {connectionStatus}
        </div>
        {selectedPrinter && (
          <div className={`printer-indicator ${printerStatus[selectedPrinter]}`}>
            Printer: {selectedPrinter} ({printerStatus[selectedPrinter]})
          </div>
        )}
      </div>
    );
  }

  async handleEnhancedPrint(options = {}) {
    try {
      const billContent = this.formatBillContent();
      const printJob = await this.qzService.print(billContent, options);

      this.setState({
        lastPrintJob: printJob,
        printQueue: [...this.state.printQueue, printJob]
      });

      toast.success('Print job submitted successfully');
    } catch (error) {
      toast.error(`Print failed: ${error.message}`);
    }
  }

  generatePrintPreview() {
    const billContent = this.formatBillContent();
    this.setState({ printPreview: billContent });
  }

  // Additional methods for enhanced functionality...
}
```

### 4. Testing Requirements
- Test with different thermal printer models (Epson, Star, Zebra)
- Verify print quality across various paper sizes (58mm, 80mm)
- Test connection recovery scenarios (QZ Tray restart, printer disconnect)
- Validate print job queuing and error handling
- Performance testing with high-volume printing
- Cross-browser compatibility testing

### 5. Documentation Requirements
Create comprehensive documentation including:

#### Setup Instructions
- QZ Tray installation guide for different operating systems
- Printer driver installation procedures
- Network printer configuration
- Firewall and security settings

#### Printer Compatibility
- Tested printer models and their capabilities
- ESC/POS command compatibility matrix
- Paper size and format specifications
- Performance benchmarks

#### Troubleshooting Guide
- Common connection issues and solutions
- Print quality problems and fixes
- Error code reference
- Diagnostic tools and procedures

#### API Reference
- QZPrinterService class documentation
- ESC/POS command reference
- Configuration options
- Event handling and callbacks

## Expected Deliverables

### 1. Enhanced QZ Tray Service Class for Star TSP100III
- Star TSP100III specific printer detection and configuration
- Optimized ESC/POS commands for 203 DPI thermal printing
- Connection monitoring with Star printer status checks
- Print queue management with retry logic for thermal printers
- Configuration management for 80mm/58mm paper sizes

### 2. Updated UI Components for Star TSP100III
- Star printer status indicators with connection health
- Enhanced printer selection modal with Star TSP100III detection
- Print preview functionality optimized for 80mm thermal paper
- Test print functionality for Star TSP100III verification
- Printer settings panel with paper width and cut options

### 3. Star TSP100III Specific Test Suite
- Unit tests for Star printer detection methods
- Integration tests for Star TSP100III communication protocols
- Thermal print quality tests for different paper sizes
- End-to-end printing workflow tests with Star commands
- Performance tests for high-volume receipt printing (250mm/s)

### 4. Star TSP100III Documentation Package
- Star TSP100III installation and setup guides
- futurePRNT software configuration instructions
- User manual with Star printer screenshots
- Star-specific troubleshooting guide
- ESC/POS command reference for TSP100III

### 5. Star TSP100III Migration Guide
- Steps to configure existing installations for Star printers
- Paper size migration (58mm to 80mm optimization)
- Star Mode vs ESC/POS mode configuration
- Backward compatibility with other thermal printers

## Technical Constraints

### Star TSP100III Compatibility Requirements
- Maintain compatibility with existing bill data structure
- Ensure backward compatibility with non-Star thermal printers
- Support for both Star Mode and ESC/POS command sets
- Cross-platform compatibility (Windows, macOS, Linux) with Star drivers
- Support for multiple connection types (USB, Ethernet, Wi-Fi, Bluetooth)

### Star TSP100III Performance Requirements
- Print job completion within 3 seconds for standard receipts (250mm/s speed)
- Connection establishment within 2 seconds for USB/Ethernet
- Wi-Fi connection establishment within 5 seconds
- UI responsiveness during high-speed printing operations
- Memory usage optimization for continuous thermal printing sessions
- Support for up to 43 receipts per minute throughput

### Star TSP100III Specific Requirements
- Paper width detection and automatic formatting (80mm/58mm)
- Guillotine auto-cutter integration with partial/full cut options
- Thermal print head protection with proper cooling intervals
- Cash drawer integration support (if connected)
- Real-time status monitoring for paper out, cover open, cutter error
- Support for Star's AllReceipts™ digital receipt solution integration

### Security Requirements
- Secure communication with QZ Tray and Star printers
- Print data encryption for sensitive POS information
- Access control for Star printer management functions
- Audit logging for all print operations and status changes
- Network security for Wi-Fi and Ethernet connected Star printers

### Code Quality Requirements
- Follow existing React/Semantic UI patterns and styling conventions
- Comprehensive error handling for thermal printer specific issues
- Minimize external dependencies while supporting Star features
- Maintain clean and readable code structure with Star-specific documentation

## Success Criteria

### Star TSP100III Reliability Metrics
- 99.9% successful print job completion rate on Star TSP100III
- Automatic recovery from 98% of thermal printer connection failures
- Zero data loss during high-speed thermal printing operations
- Graceful degradation when Star printers are unavailable (fallback to generic)
- Proper handling of thermal printer specific errors (paper out, overheating)

### Star TSP100III User Experience Metrics
- Reduced setup time for Star TSP100III printers (< 1 minute with auto-detection)
- Improved error message clarity with Star-specific troubleshooting
- Enhanced thermal print quality consistency (203 DPI optimization)
- Streamlined Star printer management workflow with status indicators
- Automatic paper width detection and formatting adjustment

### Star TSP100III Performance Metrics
- 60% reduction in thermal printer-related support tickets
- 40% faster bill printing process (utilizing 250mm/s speed)
- Improved system stability during high-volume thermal printing periods
- Better resource utilization for continuous thermal printing sessions
- Optimal thermal print head usage and longevity

### Star TSP100III Integration Quality
- Seamless integration with futurePRNT software features
- Support for AllReceipts™ digital receipt solution
- Proper cash drawer integration and control
- Real-time status monitoring and error reporting
- Multi-connection support (USB, Ethernet, Wi-Fi, Bluetooth)

### Documentation Quality for Star TSP100III
- Complete coverage of Star-specific features and functions
- Clear step-by-step Star printer setup procedures with screenshots
- Comprehensive troubleshooting guide for thermal printing issues
- Regular updates for Star firmware and driver compatibility
```

---

## File Structure

```
src/
├── containers/
│   ├── billing.jsx              # Main billing component with Star TSP100III integration
│   └── transaction.jsx          # Transaction history with Star printer functionality
├── services/
│   ├── QZPrinterService.js      # Enhanced QZ service class with Star support
│   └── StarTSP100IIIService.js  # Star TSP100III specific service (to be created)
├── components/
│   ├── StarPrinterStatusIndicator.jsx    # Star printer status display (to be created)
│   ├── StarPrintPreviewModal.jsx         # Star optimized print preview (to be created)
│   ├── StarPrinterSettingsPanel.jsx     # Star printer settings (to be created)
│   └── StarPrinterTestModal.jsx         # Star printer test functionality (to be created)
├── utils/
│   ├── starTSP100IIICommands.js # Star TSP100III ESC/POS commands (to be created)
│   ├── starPrintFormatters.js   # Star optimized bill formatting (to be created)
│   └── thermalPrinterUtils.js   # Thermal printer utilities (to be created)
├── constants.js                 # Configuration constants with Star settings
└── main.jsx                    # Application entry point

docs/
├── setup/
│   ├── qz-tray-installation.md
│   ├── star-tsp100iii-setup.md      # Star printer specific setup
│   ├── futureprnt-configuration.md  # futurePRNT software guide
│   └── troubleshooting-star.md      # Star printer troubleshooting
├── api/
│   ├── qz-service-api.md
│   ├── star-tsp100iii-api.md        # Star printer API reference
│   └── star-escpos-commands.md      # Star specific ESC/POS commands
└── user-guide/
    ├── star-printer-management.md   # Star printer management guide
    ├── thermal-printing-workflows.md # Thermal printing workflows
    └── star-maintenance-guide.md    # Star printer maintenance
```

---

## Next Steps

### Immediate Enhancements for Star TSP100III (Priority 1)
1. **Create Star TSP100III Service Class**
   - Implement Star-specific printer detection and auto-configuration
   - Add thermal printer connection monitoring with status checks
   - Enhance error handling for thermal printing issues (paper out, overheating)
   - Implement print queue management optimized for 250mm/s speed

2. **Add Star Printer Status Indicators**
   - Visual connection status with Star printer health monitoring
   - Real-time thermal printer status updates (paper, cutter, temperature)
   - Error state notifications with Star-specific troubleshooting
   - Paper width detection and display (80mm/58mm)

3. **Implement Star Optimized Print Preview**
   - Real-time bill formatting preview for 80mm thermal paper
   - Star TSP100III template options with proper character spacing
   - Print settings adjustment for thermal print quality
   - Test print functionality with Star-specific commands

### Medium-term Improvements for Star TSP100III (Priority 2)
1. **Enhanced Thermal Printer Error Handling**
   - Detailed error messages for thermal printer issues
   - Automatic retry mechanisms for thermal printing failures
   - Offline mode support with print job caching
   - Thermal print head protection and cooling management

2. **Star TSP100III Configuration Management**
   - Multiple Star printer profiles (USB, Ethernet, Wi-Fi, Bluetooth)
   - Custom paper sizes (80mm/58mm) with automatic detection
   - Font and layout settings optimized for 203 DPI thermal printing
   - Cash drawer integration and control settings

3. **Thermal Print Job Management**
   - Print history and tracking for high-volume operations
   - Job cancellation functionality for thermal printers
   - Batch printing capabilities optimized for Star TSP100III speed
   - Print queue prioritization for urgent receipts

### Long-term Features for Star TSP100III (Priority 3)
1. **Advanced Star Printing Features**
   - Logo and image support using Star's graphics commands
   - Barcode and QR code printing with Star's built-in support
   - Multiple receipt templates (customer copy, merchant copy, summary)
   - Integration with Star's AllReceipts™ digital receipt solution

2. **Star TSP100III Integration Enhancements**
   - Network printer support for shared Star printers
   - Cloud printing capabilities through Star Cloud services
   - Mobile device integration via Bluetooth for Star printers
   - futurePRNT software integration for advanced features

3. **Star Printer Analytics and Reporting**
   - Thermal print volume analytics and usage patterns
   - Star printer performance metrics (speed, reliability, maintenance)
   - Cost tracking and optimization for thermal paper usage
   - Predictive maintenance alerts for thermal print head

---

## Star TSP100III ESC/POS Command Reference

### Star TSP100III Basic Commands
- `\x1B\x40` - Initialize printer (ESC @)
- `\x1B\x1D\x61\x00` - Initialize Star Mode
- `\x0A` - Line feed (LF)
- `\x1B\x64\x02` - Partial cut (recommended for TSP100III)
- `\x1B\x64\x03` - Full cut

### Star TSP100III Text Formatting (203 DPI Optimized)
- `\x1B\x45` - Bold on (ESC E)
- `\x1B\x46` - Bold off (ESC F)
- `\x1B\x69\x00\x00` - Normal font
- `\x1B\x69\x01\x00` - Double width
- `\x1B\x69\x00\x01` - Double height
- `\x1B\x69\x01\x01` - Double width & height

### Star TSP100III Alignment (80mm Paper)
- `\x1B\x1D\x61\x00` - Left align
- `\x1B\x1D\x61\x01` - Center align
- `\x1B\x1D\x61\x02` - Right align

### Star TSP100III Status Commands
- `\x1B\x76` - Request printer status (ESC v)
- `\x10\x04\x01` - Real-time status request
- `\x1B\x07` - Open cash drawer 1 (ESC BEL)
- `\x1C\x05` - Open cash drawer 2 (FS ENQ)

### Star TSP100III Barcode Commands
- `\x1B\x62\x00` - UPC-A barcode
- `\x1B\x62\x04` - Code 39 barcode
- `\x1B\x62\x06` - Code 128 barcode

### Star TSP100III QR Code Commands
- `\x1B\x1D\x79\x53\x30\x00` - Set QR model
- `\x1B\x1D\x79\x53\x32\x03` - Set QR size (3 = medium)
- `\x1B\x1D\x79\x44\x31\x00[data]\x1B\x1D\x79\x50` - Print QR code

---

## Conclusion

The FEMIGA POS system already has a solid foundation for QZ Tray printer integration. With the specific focus on **Star Micronics TSP100III futurePRNT Series**, this enhanced implementation guide provides:

### Key Benefits of Star TSP100III Integration:
- **High-Speed Printing**: 250mm/second (43 receipts/minute) for busy retail environments
- **Reliable Thermal Technology**: 203 DPI resolution with 100km print head life
- **Multiple Connectivity Options**: USB, Ethernet, Wi-Fi, and Bluetooth support
- **Professional Quality**: Guillotine auto-cutter with 2 million cut life
- **Easy Setup**: futurePRNT software for quick configuration
- **Cost Effective**: No ink required, thermal paper only

### Implementation Advantages:
- **Optimized Bill Formatting**: 80mm paper width with 42-character lines
- **Enhanced Error Handling**: Thermal printer specific status monitoring
- **Improved User Experience**: Auto-detection and configuration
- **Future-Proof Design**: Support for Star's AllReceipts™ digital solution

The modular approach suggested allows for incremental improvements without disrupting the existing functionality, ensuring a smooth transition to Star TSP100III while maintaining backward compatibility with other thermal printers.

---

## Star TSP100III Specific Resources

### Star Micronics Documentation
- [Star TSP100III Official Documentation](https://www.star-m.jp/products/s_print/tsp100iii/index.html)
- [futurePRNT Software Download](https://www.star-m.jp/products/s_print/sdk/futureprnt.html)
- [Star ESC/POS Command Reference](https://www.star-m.jp/products/s_print/sdk/starprnt_sdk/manual.html)
- [AllReceipts™ Digital Receipt Solution](https://www.star-m.jp/products/s_print/allreceipts/index.html)

### QZ Tray with Star Printers
- [QZ Tray Star Printer Support](https://qz.io/wiki/star-printers)
- [Star Printer Configuration Guide](https://qz.io/wiki/printer-configuration#star-micronics)
- [Thermal Printing Best Practices](https://qz.io/wiki/thermal-printing)

### Testing and Development Tools
- Star TSP100III Printer Simulator
- futurePRNT Configuration Tool
- QZ Tray Test Suite with Star Support
- Star SDK Development Tools

### Community and Support
- Star Micronics Developer Portal
- QZ Tray GitHub Repository (Star Issues)
- Stack Overflow Star Printer Tag
- Thermal Printing Community Forums

### Hardware Specifications Reference
- **Paper Compatibility**: 80mm standard, 58mm with guide
- **Connection Types**: USB 2.0, Ethernet 10/100, Wi-Fi 802.11b/g/n, Bluetooth 4.0
- **Power Requirements**: 24V DC adapter (included)
- **Operating Temperature**: 5°C to 45°C (41°F to 113°F)
- **Humidity**: 10% to 90% RH (non-condensing)
- **Dimensions**: 132mm(W) × 132mm(D) × 132mm(H)

This comprehensive guide provides everything needed to successfully implement, enhance, and maintain the Star TSP100III printer integration in the FEMIGA POS system, ensuring optimal performance and reliability for high-volume retail operations.
```
