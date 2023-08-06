
//% color=#001FCF icon="\uf204" block="DIP Schalter" weight=18
namespace dipswitch
/* 230806
Calliope i2c Erweiterung für 'Grove - 6-Position DIP Switch' und 'Grove - 5-Way Switch'
optimiert und getestet für die gleichzeitige Nutzung mehrerer i2c Module am Calliope
[Projekt-URL] https://github.com/calliope-net/dip-switch
[README]      https://calliope-net.github.io/dip-switch

[Hardware] https://wiki.seeedstudio.com/Grove-6-Position_DIP_Switch/
           https://wiki.seeedstudio.com/Grove-5-Way_Switch/
[Software] https://github.com/Seeed-Studio/Grove_Multi_Switch/
           https://github.com/Seeed-Studio/Grove_Multi_Switch/archive/master.zip

keine Datenblätter zu i2c Registern / Programmierung gefunden
Code anhand der cpp-Beispiele aus master.zip neu programmiert von Lutz Elßner im August 2023
*/ {
    export enum eADDR { DIP_SWITCH = 0x03 } // i2c Adressen
    export enum eRegister {
        I2C_CMD_GET_DEV_ID = 0x00,      // gets device ID information
        I2C_CMD_GET_DEV_EVENT = 0x01,	// gets device event status
        I2C_CMD_EVENT_DET_MODE = 0x02,	// enable button event detect mode
        I2C_CMD_BLOCK_DET_MODE = 0x03,	// enable button block detect mode
        I2C_CMD_AUTO_SLEEP_ON = 0xb2,	// enable device auto sleep mode
        I2C_CMD_AUTO_SLEEP_OFF = 0xb3,	// disable device auto sleep mode (default mode)
        I2C_CMD_SET_ADDR = 0xc0,	    // sets device i2c address
        I2C_CMD_RST_ADDR = 0xc1,    	// resets device i2c address
        I2C_CMD_TEST_TX_RX_ON = 0xe0,	// enable TX RX pin test mode
        I2C_CMD_TEST_TX_RX_OFF = 0xe1,	// disable TX RX pin test mode
        I2C_CMD_TEST_GET_VER = 0xe2,	// use to get software version
        I2C_CMD_GET_DEVICE_UID = 0xf1	// use to get chip id
    }
    export enum eSwitch {
        DIP1 = 1, DIP2 = 2, DIP3 = 3, DIP4 = 4, DIP5 = 5, DIP6 = 6,
        N = 1, W = 2, S = 3, O = 4, M = 5
    }
    export enum eONOFF { ON = 0, OFF = 1 }

    let m_event: Buffer // internes Array für aktuelle Schalter-Stellung


    // ========== group="i2c Schalter init / event detect mode"

    //% group="i2c Schalter init / event detect mode"
    //% block="i2c %i2cADDR event detect mode %pEvent" weight=94
    export function setEvent(pADDR: eADDR, pEvent: boolean) {   // === Beispielcode deaktiviert ===
        // probeDevID()
        let m_btnCnt = btnCnt(pADDR) // Register I2C_CMD_GET_DEV_ID
        //let m_devID = readReg(pADDR, eRegister.I2C_CMD_GET_DEV_ID, 4)
        // getDevVer
        //let versions = readReg(pADDR, eRegister.I2C_CMD_TEST_GET_VER, 10) // _MULTI_SWITCH_VERSIONS_SZ = 10
        // getSwitchCount
        //switch (m_devID.getUint8(0)) {
        //    case 2: m_btnCnt = 5; break
        //    case 3: m_btnCnt = 6; break
        //}
        //return (m_btnCnt > 0)
        if (m_btnCnt > 0) {
            // setEventMode
            let b = pins.createBuffer(1)
            if (pEvent) { b.setUint8(0, eRegister.I2C_CMD_EVENT_DET_MODE) } // enable Events
            else { b.setUint8(0, eRegister.I2C_CMD_BLOCK_DET_MODE) }        // disable Events
            pins.i2cWriteBuffer(pADDR, b)
        }
    }

    //% group="i2c Schalter init / event detect mode"
    //% block="i2c %i2cADDR Modell (5 oder 6 Schalter)" weight=92
    export function btnCnt(pADDR: eADDR) {
        switch (readReg(pADDR, eRegister.I2C_CMD_GET_DEV_ID, 4).getUint8(0)) {
            case 2: return 5    // Grove 5-Way Tactile
            case 3: return 6    // Grove 6-Position DIP Switch
        }
        return 0
    }


    // ========== group="i2c Schalter einlesen in Array"

    //% group="i2c Schalter einlesen in Array"
    //% block="i2c %i2cADDR lese Schalter in internes Array" weight=88
    export function readSwitch(pADDR: eADDR) {
        m_event = readReg(pADDR, eRegister.I2C_CMD_GET_DEV_EVENT, 10)
    }


    // ========== group="Schalter auslesen aus Array"

    //% group="Schalter auslesen aus Array"
    //% block="Schalter %pSwitch %pONOFF aus Array" weight=78
    export function getON(pSwitch: eSwitch, pONOFF: eONOFF): boolean {
        if (m_event != null && m_event.length >= 10) {
            return (m_event.getUint8(pSwitch + 3) & 0x01) == pONOFF // ON=0 OFF=1
        } else { return false }
    }

    //% group="Schalter auslesen aus Array"
    //% block="erster Schalter, der ON ist, (0-6) aus Array" weight=76
    export function getNumber() {
        for (let iSwitch = eSwitch.DIP1; iSwitch <= eSwitch.DIP6; iSwitch += 1) {
            if (getON(iSwitch, eONOFF.ON)) { return iSwitch }
        }
        return 0
    }

    //% group="Schalter auslesen aus Array"
    //% block="alle Schalter als Bitmuster (0-63) aus Array" weight=74
    export function getBIN() {
        let bin: number = 0
        for (let iSwitch = eSwitch.DIP1; iSwitch <= eSwitch.DIP6; iSwitch += 1) {
            if (getON(iSwitch, eONOFF.ON)) { bin = bin | 1 << (iSwitch - 1) }
        }
        return bin
    }


    // ========== group="Logik"

    export enum eBit { AND, OR, XOR, NOT_AND, LEFT_SHIFT, RIGHT_SHIFT }

    //% group="Logik"
    //% block="bitwise %a %operator %b" weight=68
    export function bitwise(a: number, operator: eBit, b: number): number {
        if (operator == eBit.AND) { return a & b }
        else if (operator == eBit.OR) { return a | b }
        else if (operator == eBit.XOR) { return a ^ b }
        else if (operator == eBit.NOT_AND) { return (~a) & b }
        else if (operator == eBit.LEFT_SHIFT) { return a << b }
        else if (operator == eBit.RIGHT_SHIFT) { return a >> b }
        else { return a }
    }


    // ========== advanced=true

    // ========== group="i2c Register" advanced=true

    //% group="i2c Register" advanced=true
    //% block="i2c %pADDR lese Register %pRegister UInt32LE" weight=48
    export function readRegister32(pADDR: eADDR, pRegister: eRegister) { // 4 Byte sizeof id uint32_t
        return readReg(pADDR, pRegister, 4).getNumber(NumberFormat.UInt32LE, 0)
    }

    //% group="i2c Register" advanced=true
    //% block="i2c %pADDR lese Register %pRegister size %pSize" weight=46
    //% pSize.defl=10
    export function readRegister(pADDR: eADDR, pRegister: eRegister, pSize: number) {
        return readReg(pADDR, pRegister, pSize).toArray(NumberFormat.Int8LE)
    }


    // ========== group="für Programmierer" advanced=true

    //% group="für Programmierer" advanced=true
    //% block="i2c-Adressen %pADDR" weight=38
    export function getEnumADDR(pADDR: eADDR) { return pADDR }

    //% group="für Programmierer" advanced=true
    //% block="Register-Nummern %pRegister" weight=34
    export function getEnumRegister(pReg: eRegister) { return pReg }


    // ========== group="internes Array auslesen" advanced=true

    //% group="internes Array auslesen" advanced=true
    //% block="Event Code (Byte 0-3) UInt32LE aus Array" weight=28
    export function getEvent() {
        if (m_event != null && m_event.length >= 4) { return m_event.getNumber(NumberFormat.UInt32LE, 0) }
        else { return -1 }
    }

    //% group="internes Array auslesen" advanced=true
    //% block="gesamtes Array (10 Byte)" weight=26
    export function getArray(): number[] {
        if (m_event != null) { return m_event.toArray(NumberFormat.UInt32LE) }
        else { return [] }
    }


    // ========== PRIVATE function (return Buffer)

    function readReg(pADDR: eADDR, pReg: eRegister, pSize: number): Buffer {
        let b = pins.createBuffer(1)
        b.setUint8(0, pReg)
        pins.i2cWriteBuffer(pADDR, b)
        return pins.i2cReadBuffer(pADDR, pSize)
    }

} // dip-switch.ts
