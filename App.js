import React, { Component } from 'react';
import { Alert, AppState, BackHandler } from 'react-native';
import {
  BarcodeCapture,
  BarcodeCaptureOverlay,
  BarcodeCaptureSettings,
  Symbology,
  SymbologyDescription,
} from 'scandit-react-native-datacapture-barcode';
import {
  Camera,
  CameraSettings,
  DataCaptureContext,
  DataCaptureView,
  FrameSourceState,
  RectangularViewfinder,
  RectangularViewfinderStyle,
  RectangularViewfinderLineStyle,
  VideoResolution,
  SizeWithUnit,
  NumberWithUnit,
  MeasureUnit,
  MarginsWithUnit,
} from 'scandit-react-native-datacapture-core';

import { requestCameraPermissionsIfNeeded } from './camera-permission-handler';

export default class App extends Component {

  constructor() {
    super();

    // Create data capture context using your license key.
    this.dataCaptureContext = DataCaptureContext.forLicenseKey('AeIPnNWBQeSbButw9z5lhQMfM4mXN4QW9QqXbtFOOkLTOlk4fkytxWNAEECEbZBI82IgZ/lLj4nkQvKgoSo8hlN8NVTOU1naTjmIaw4cl2PZdSwsS2JC9McVx1TAPPAkSRdJQiUK9d23IXAzTBOVC2+crf2VgORzPo9bbJLcicft2jjozI3NQkshU2471EJrSI8SEf7pN1kgWAXfr/LnSXoux6/yO+cg22Mzpc6iC+EkqBvQPyL3+6ZuwBCWzv2iQgMoknkBBLMTr54Gs+v55sPakBuYRnEGKiUB9Wn+MlcZbhprdJG/RfuubDStuzY0ZlKYYbHE+jkaRklr6UxZNKMvxcZKYnc/5ihtUngkYo3V3WIb0qVN+zwI9/0PWNjvgoHYGOygBiOn8Z6HhpuFqgxSnEAVv/thyzPA1NaoPZYBPraqKTgwbcQ6GkNBVbQNPAJ1T4cWT9srKIMrIXG2vFvDkEFFFujwDEuMdsekH1qk/wheK0u2QQ+JM7WZJbziugnkB32CT2byEJxaz0z3/x46/B5n1DNM6+pxLmMcXJO7DOjf3nDDOy3Ny5YjvfT14ffJ5ERX82zb2w7SbyGQ6pCb+23ylWz+CgnDHYwd3tGzR89ovr1Zzy8x7AaVxNCLB6UDIiNojl/D8Y4mxv2Ps5iCIGS8eKV0ucRVQcIvOSHPad79VlgUf7mgJrzsbVLPftOFIMfKhyH4Gq2R2IaNSz45OHQd99iw7EK9PtCGi13iGkpzEUA7YRZ1E5xQEXQGsqHyiXd8dHHGyykfiS6UKGMikJSKfuxApc3Q4cUVwKDVSTb8CWx5');
    this.viewRef = React.createRef();
  this.SCANNER_AREA_WIDTH = 0.8;
  this.SCANNER_AREA_HEIGHT = 0.4;
  }

  componentDidMount() {
    AppState.addEventListener('change', this.handleAppStateChange);
    this.setupScanning();
  }

  componentWillUnmount() {
    AppState.removeEventListener('change', this.handleAppStateChange);
    this.dataCaptureContext.dispose();
  }

  handleAppStateChange = async (nextAppState) => {
    if (nextAppState.match(/inactive|background/)) {
      this.stopCapture();
    } else {
      this.startCapture();
    }
  }

  startCapture() {
    this.startCamera();
    this.barcodeCaptureMode.isEnabled = true;
  }

  stopCapture() {
    this.barcodeCaptureMode.isEnabled = false;
    this.stopCamera();
  }

  stopCamera() {
    if (this.camera) {
      this.camera.switchToDesiredState(FrameSourceState.Off);
    }
  }

  startCamera() {
    if (!this.camera) {
      // Use the world-facing (back) camera and set it as the frame source of the context. The camera is off by
      // default and must be turned on to start streaming frames to the data capture context for recognition.
      this.camera = Camera.default;
      this.dataCaptureContext.setFrameSource(this.camera);

      const cameraSettings = new CameraSettings();
      cameraSettings.preferredResolution = VideoResolution.FullHD;
      this.camera.applySettings(cameraSettings);
    }

    // Switch camera on to start streaming frames and enable the barcode capture mode.
    // The camera is started asynchronously and will take some time to completely turn on.
    requestCameraPermissionsIfNeeded()
      .then(() => this.camera.switchToDesiredState(FrameSourceState.On))
      .catch(() => BackHandler.exitApp());
  }

  setupScanning() {
    // The barcode capturing process is configured through barcode capture settings
    // and are then applied to the barcode capture instance that manages barcode recognition.
    const settings = new BarcodeCaptureSettings();

    // The settings instance initially has all types of barcodes (symbologies) disabled. For the purpose of this
    // sample we enable a very generous set of symbologies. In your own app ensure that you only enable the
    // symbologies that your app requires as every additional enabled symbology has an impact on processing times.
    settings.enableSymbologies([
      Symbology.Code128,
      Symbology.EAN13UPCA,
      Symbology.UPCE,
      Symbology.EAN8,
      Symbology.QR,
      Symbology.DataMatrix
    ]);
    
    // Some linear/1d barcode symbologies allow you to encode variable-length data. By default, the Scandit
    // Data Capture SDK only scans barcodes in a certain length range. If your application requires scanning of one
    // of these symbologies, and the length is falling outside the default range, you may need to adjust the "active
    // symbol counts" for this symbology. This is shown in the following few lines of code for one of the
    // variable-length symbologies.
    const symbologySettings = settings.settingsForSymbology(Symbology.DataMatrix);
    symbologySettings.isColorInvertedEnabled = true;
    symbologySettings.setExtensionEnabled("direct_part_marking_mode", true);

    // Create new barcode capture mode with the settings from above.
    this.barcodeCaptureMode = BarcodeCapture.forContext(this.dataCaptureContext, settings);

    // Register a listener to get informed whenever a new barcode got recognized.
    this.barcodeCaptureListener = {
      didScan: (_, session) => {
        const barcode = session.newlyRecognizedBarcodes[0];
        const symbology = new SymbologyDescription(barcode.symbology);
        console.log("session",session);

        // The `alert` call blocks execution until it's dismissed by the user. As no further frames would be processed
        // until the alert dialog is dismissed, we're showing the alert through a timeout and disabling the barcode
        // capture mode until the dialog is dismissed, as you should not block the BarcodeCaptureListener callbacks for
        // longer periods of time. See the documentation to learn more about this.
        this.barcodeCaptureMode.isEnabled = false;

        Alert.alert(
          null,
          `Scanned: ${barcode.data} (${symbology.readableName})`,
          [{ text: 'OK', onPress: () => this.barcodeCaptureMode.isEnabled = true }],
          { cancelable: false }
        );
      }
    };

    this.barcodeCaptureMode.addListener(this.barcodeCaptureListener);

    // Add a barcode capture overlay to the data capture view to render the location of captured barcodes on top of
    // the video preview. This is optional, but recommended for better visual feedback.
    this.overlay = BarcodeCaptureOverlay.withBarcodeCaptureForView(this.barcodeCaptureMode, this.viewRef.current);
    this.viewfinder = new RectangularViewfinder(
        RectangularViewfinderStyle.Legacy,
        RectangularViewfinderLineStyle.Light,
    );
    this.viewfinder.setSize(new SizeWithUnit(
      new NumberWithUnit(0.8,MeasureUnit.Fraction),
      new NumberWithUnit(0.4,MeasureUnit.Fraction),
    ) )

    console.log("this view",this.viewRef.current);

    this.overlay.viewfinder = this.viewfinder;
    this.viewRef.current.addOverlay(this.overlay);
    
    // this.viewRef.current.scanAreaMargins = new MarginsWithUnit(
    //  new NumberWithUnit(0.1,MeasureUnit.Fraction),
    //  new NumberWithUnit(0.3,MeasureUnit.Fraction),
    //  new NumberWithUnit(0.1,MeasureUnit.Fraction),
    //  new NumberWithUnit(0.3,MeasureUnit.Fraction),
    // )
  }

  render() {
    return (
      <DataCaptureView style={{ flex: 1 }} context={this.dataCaptureContext} ref={this.viewRef} />
    );
  };
}