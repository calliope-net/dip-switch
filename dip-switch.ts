
//% color=#003F7F icon="\uf204" block="DIP Schalter" weight=04
namespace dipswitch
/* 230806 231007 https://github.com/calliope-net/dip-switch
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
    export enum eADDR { DIP_x03 = 0x03, DIP_SWITCH_x03 = 0x03 } // i2c Adressen
    let n_i2cCheck: boolean = false // i2c-Check
    let n_i2cError: number = 0 // Fehlercode vom letzten WriteBuffer (0 ist kein Fehler)
    let n_Buffer: Buffer // internes Array für aktuelle Schalter-Stellung
    // Byte 0-3: 32 Bit UInt32LE; Byte 4:Schalter 1 ... Byte 9:Schalter 6
    // Byte 4-9: 00000001:Schalter OFF; 00000001:Schalter ON; Bit 1-7 löschen & 0x01

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
    export enum eONOFF { ON = 0, OFF = 1 } // Schalter aus wenn Bit 0 = 1


    // ========== group="i2c Schalter init / event detect mode"

    //% group="i2c Schalter init / event detect mode"
    //% block="i2c %pADDR beim Start || event-detect-mode %pEvent i2c-Check %ck" weight=4
    //% pADDR.shadow="dipswitch_eADDR"
    //% pEvent.shadow="toggleOnOff" pEvent.defl=0
    //% ck.shadow="toggleOnOff" ck.defl=1
    export function setEvent(pADDR: number, pEvent?: boolean, ck?: boolean) {   // === Beispielcode deaktiviert ===
        n_i2cCheck = (ck ? true : false) // optionaler boolean Parameter kann undefined sein
        n_i2cError = 0 // Reset Fehlercode

        // probeDevID()
        //let m_btnCnt: number = btnCnt(pADDR) // Register I2C_CMD_GET_DEV_ID

        //let m_devID = readReg(pADDR, eRegister.I2C_CMD_GET_DEV_ID, 4)
        // getDevVer
        //let versions = readReg(pADDR, eRegister.I2C_CMD_TEST_GET_VER, 10) // _MULTI_SWITCH_VERSIONS_SZ = 10
        // getSwitchCount
        //switch (m_devID.getUint8(0)) {
        //    case 2: m_btnCnt = 5; break
        //    case 3: m_btnCnt = 6; break
        //}
        //return (m_btnCnt > 0)
        if (btnCnt(pADDR) > 0) {
            // setEventMode
            let b = Buffer.create(1)
            if (pEvent)
                b.setUint8(0, eRegister.I2C_CMD_EVENT_DET_MODE) // enable Events
            else
                b.setUint8(0, eRegister.I2C_CMD_BLOCK_DET_MODE)// disable Events
            i2cWriteBuffer(pADDR, b)
        }

    }

    //% group="i2c Schalter init / event detect mode"
    //% block="i2c %pADDR Modell (5 oder 6 Schalter)" weight=2
    //% pADDR.shadow="dipswitch_eADDR"
    export function btnCnt(pADDR: number) {
        switch (readReg(pADDR, eRegister.I2C_CMD_GET_DEV_ID, 4).getUint8(0)) {
            case 2: return 5    // Grove 5-Way Tactile
            case 3: return 6    // Grove 6-Position DIP Switch
        }
        return 0
    }

    // ========== group="i2c Schalter direkt einlesen (ohne Array)"

    //% group="i2c Schalter direkt einlesen (ohne Array)"
    //% block="i2c %pADDR lese Schalter als Bitmuster (0-63)"
    //% pADDR.shadow="dipswitch_eADDR"
    export function readBIN(pADDR: number) {
        let bu: Buffer = readReg(pADDR, eRegister.I2C_CMD_GET_DEV_EVENT, 10)
        let bin: number = 0
        for (let iSwitch = eSwitch.DIP1; iSwitch <= eSwitch.DIP6; iSwitch += 1) {
            if ((bu.getUint8(iSwitch + 3) & 0x01) == eONOFF.ON) { bin = bin | 1 << (iSwitch - 1) }
        }
        return bin
    }



    // ========== group="i2c Schalter einlesen in Array"

    //% group="i2c Schalter einlesen in Array"
    //% block="i2c %pADDR lese Schalter in internes Array"
    //% pADDR.shadow="dipswitch_eADDR"
    export function readSwitch(pADDR: number) {
        n_Buffer = readReg(pADDR, eRegister.I2C_CMD_GET_DEV_EVENT, 10)
    }


    // ========== group="Schalter auslesen aus Array"

    //% group="Schalter auslesen aus Array"
    //% block="Schalter %pSwitch %pONOFF aus Array" weight=8
    export function getON(pSwitch: eSwitch, pONOFF: eONOFF): boolean {
        if (n_Buffer != null && n_Buffer.length >= 10) {
            return (n_Buffer.getUint8(pSwitch + 3) & 0x01) == pONOFF // ON=0 OFF=1
        } else { return false }
    }

    //% group="Schalter auslesen aus Array"
    //% block="erster Schalter, der ON ist, (1-6;0) aus Array" weight=6
    export function getNumber() {
        for (let iSwitch = eSwitch.DIP1; iSwitch <= eSwitch.DIP6; iSwitch += 1) {
            if (getON(iSwitch, eONOFF.ON)) { return iSwitch }
        }
        return 0
    }

    //% group="Schalter auslesen aus Array"
    //% block="alle Schalter als Bitmuster (0-63) aus Array" weight=4
    export function getBIN() {
        let bin: number = 0
        for (let iSwitch = eSwitch.DIP1; iSwitch <= eSwitch.DIP6; iSwitch += 1) {
            if (getON(iSwitch, eONOFF.ON)) { bin = bin | 1 << (iSwitch - 1) }
        }
        return bin
    }


    // ========== group="Logik"

    export enum eBit {
        //% block="a & b AND"
        AND,
        //% block="a | b OR"
        OR,
        //% block="a ^ b XOR"
        XOR,
        //% block="(~a) & b (NOT a) AND b"
        NOT_AND,
        //% block="a << b"
        LEFT,
        //% block="a >> b"
        RIGHT,
        //% block="a >>> b"
        RIGHTZ
    }



    // ========== advanced=true

    //% group="Logik" advanced=true
    //% block="Bitweise %a %operator %b"
    export function bitwise(a: number, operator: eBit, b: number): number {
        switch (operator) {
            case eBit.AND: { return a & b }
            case eBit.OR: { return a | b }
            case eBit.XOR: { return a ^ b }
            case eBit.NOT_AND: { return (~a) & b }
            case eBit.LEFT: { return a << b }
            case eBit.RIGHT: { return a >> b }
            case eBit.RIGHTZ: { return a >>> b }
            default: { return a }
        }
    }


    // ========== group="i2c Register" advanced=true

    //% group="i2c Register" advanced=true
    //% block="i2c %pADDR lese Register %pRegister UInt32LE" weight=8
    //% pADDR.shadow="dipswitch_eADDR"
    export function readRegister32(pADDR: number, pRegister: eRegister) { // 4 Byte sizeof id uint32_t
        return readReg(pADDR, pRegister, 4).getNumber(NumberFormat.UInt32LE, 0)
    }

    //% group="i2c Register" advanced=true
    //% block="i2c %pADDR lese Register %pRegister size %pSize" weight=6
    //% pADDR.shadow="dipswitch_eADDR"
    //% pSize.defl=10
    export function readRegister(pADDR: number, pRegister: eRegister, pSize: number) {
        return readReg(pADDR, pRegister, pSize).toArray(NumberFormat.Int8LE)
    }



    // ========== group="internes Array auslesen" advanced=true

    //% group="internes Array auslesen" advanced=true
    //% block="Event Code (Byte 0-3) UInt32LE aus Array" weight=8
    export function getEvent() {
        if (n_Buffer != null && n_Buffer.length >= 4) { return n_Buffer.getNumber(NumberFormat.UInt32LE, 0) }
        else { return -1 }
    }

    //% group="internes Array auslesen" advanced=true
    //% block="gesamtes Array (10 Byte)" weight=6
    export function getArray(): number[] {
        if (n_Buffer != null)
            return n_Buffer.toArray(NumberFormat.UInt8LE)
        //return m_event.toArray(NumberFormat.UInt32LE)
        else
            return []
    }


    // ========== PRIVATE function (return Buffer)

    function readReg(pADDR: number, pReg: eRegister, pSize: number): Buffer {
        let b = Buffer.create(1)
        b.setUint8(0, pReg)
        i2cWriteBuffer(pADDR, b)
        return i2cReadBuffer(pADDR, pSize)
    }



    // ========== group="Register und i2c Adressen"

    //% group="Register und i2c Adressen" advanced=true
    //% block="%pReg" weight=6
    export function getEnumRegister(pReg: eRegister) { return pReg }

    //% blockId=dipswitch_eADDR
    //% group="Register und i2c Adressen" advanced=true
    //% block="%pADDR" weight=4
    export function dipswitch_eADDR(pADDR: eADDR): number { return pADDR }

    //% group="Register und i2c Adressen" advanced=true
    //% block="i2c Fehlercode" weight=2
    export function i2cError() { return n_i2cError }

    function i2cWriteBuffer(pADDR: number, buf: Buffer, repeat: boolean = false) {
        if (n_i2cError == 0) { // vorher kein Fehler
            n_i2cError = pins.i2cWriteBuffer(pADDR, buf, repeat)
            if (n_i2cCheck && n_i2cError != 0)  // vorher kein Fehler, wenn (n_i2cCheck=true): beim 1. Fehler anzeigen
                basic.showString(Buffer.fromArray([pADDR]).toHex()) // zeige fehlerhafte i2c-Adresse als HEX
        } else if (!n_i2cCheck)  // vorher Fehler, aber ignorieren (n_i2cCheck=false): i2c weiter versuchen
            n_i2cError = pins.i2cWriteBuffer(pADDR, buf, repeat)
        //else { } // n_i2cCheck=true und n_i2cError != 0: weitere i2c Aufrufe blockieren
    }

    function i2cReadBuffer(pADDR: number, size: number, repeat: boolean = false): Buffer {
        if (!n_i2cCheck || n_i2cError == 0)
            return pins.i2cReadBuffer(pADDR, size, repeat)
        else
            return Buffer.create(size)
    }

} // dip-switch.ts
