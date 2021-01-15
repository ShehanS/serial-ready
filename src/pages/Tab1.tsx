import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar, IonButton, IonCard, IonCardSubtitle, IonCardTitle, IonToast, IonItem, IonInput, IonRow, IonCardHeader, IonCardContent } from '@ionic/react';
import './Tab1.css';
import { BluetoothSerial } from '@ionic-native/bluetooth-serial';
import React from 'react';
import { Observable, Subscription, from } from 'rxjs';
import { mergeMap } from 'rxjs/operators';
import { useForm } from "react-hook-form";
let connection: Subscription;
let connectionCommunication: Subscription;
let reader: Observable<any>;




//bluetooth service
function turnOnBluetooth() {
  BluetoothSerial.isEnabled().then(() => {
    console.log("[bluetooth.service-enable ok]");
  }, () => {
    console.log("[bluetooth.service-try to enable bluetooth]");
    BluetoothSerial.enable().then(() => {
      console.log("[bluetooth.service-bluetooth got enable]");
    }, () => {
      console.log("[bluetooth.service-isn't enable]");
    });
  });
}

//getting paired devices 
function searchBluetooth(): Promise<Object> {
  return new Promise((resolve, reject) => {
    BluetoothSerial.isEnabled().then(success => {
      BluetoothSerial.list().then(response => {
        if (response.length > 0) {
          resolve(response);

        } else {
          reject('BLUETOOTH.NOT_DEVICES_FOUND');
        }
      }).catch((error) => {
        console.log("[bluetooth.service-41] Error: " + JSON.stringify(error));
        reject('BLUETOOTH.NOT_AVAILABLE_IN_THIS_DEVICE');
      });
    }, fail => {
      console.log("[bluetooth.service-45] Error: " + JSON.stringify(fail));
      reject('BLUETOOTH.NOT_AVAILABLE');
    });
  });
}



//currect connection disconnect
function disconnect(): Promise<boolean> {
  return new Promise((result) => {
    if (connectionCommunication) {
      connectionCommunication.unsubscribe();
    }
    if (connection) {
      connection.unsubscribe();
    }
    result(true);
  });
}

//data send and receiver
function dataInOut(message: string): Observable<any> {
  return new Observable(observer => {
    BluetoothSerial.isConnected().then((isConnected) => {
      reader = from(BluetoothSerial.write(message)).pipe(mergeMap(() => {
        return BluetoothSerial.subscribeRawData();
      })).pipe(mergeMap(() => {
        return BluetoothSerial.readUntil('\n');
      }));
      reader.subscribe(data => {
        console.log(data);
        observer.next(data);
      });
    }, notConected => {
      observer.next('BLUETOOTH.NOT_CONNECTED');
      observer.complete();
    });
  });
}



interface IDevice {
  name: string;
  address: string;
  id: string;
}

let initialValues = {
  customMessage: ""
}

const Tab1: React.FC = () => {
  const defaultDevices: IDevice[] = [];
  const [toggleButtonState, setToggleButton] = React.useState(false);
  const [buttonState, setButtonState] = React.useState(true);
  const [showToast, setShowToast] = React.useState(false);
  const [connectionState, setConnectionState] = React.useState("");
  const [rxMessage, setRXMessage] = React.useState("");
  const [devicesList, setDeviceList]: [IDevice[], (devicesList: IDevice[]) => void] = React.useState(
    defaultDevices
  );
  const { handleSubmit } = useForm({
    defaultValues: initialValues
  });
  const [customMessage, setDataCustomMessage] = React.useState<string>();

  //new connection creation
  function createConnection(id: string): Promise<string> {
    return new Promise((resolve, reject) => {
      connection = BluetoothSerial.connect(id).subscribe((data) => {
        console.log('connected to:', id, data);
        dataInOut(`initilize\n`).subscribe(data => {
          if (data !== 'BLUETOOTH.NOT_CONNECTED') {
            try {
              if (data) {           
                setRXMessage(data);
              }
            } catch (error) {
              console.log("[bluetooth-168]:" + JSON.stringify(error));
            }
  
          } else {
            console.log("[couldn't connect with bluetooth]:" );
          }
        });
       
        resolve('BLUETOOTH.CONNECTED');
      }, fail => {
        console.log("[bluetooth.service-88] Error context: " + JSON.stringify(fail));
        reject('BLUETOOTH.CANNOT_CONNECT');
      });
    });
  
  }

  //send enter commands
  const sendDataCustomMessage = (data: any) => {
    BluetoothSerial.isConnected().then(() => {
      dataInOut(`${data}\n`).subscribe(data => {
        if (data !== 'BLUETOOTH.NOT_CONNECTED') {
          try {
            if (data) {
              setRXMessage(data)
              console.log(data);

            }
          } catch (error) {
            console.log("[bluetooth-168]:" + JSON.stringify(error));
          }

        } else {
          console.log("[couldn't connect with bluetooth]:" );
        }
      });
    }).catch(error => console.log(error));
  };
  const onSubmit = (data: any) => {
    console.log(data.message);
  };



//bluetooth service unsubscribe
  function disconnectDevice() {
    disconnect().then(status => {
      if (status == true) {
        connection.unsubscribe();
        setShowToast(true);
        setConnectionState("Disconnect");
        setButtonState(true);
      }
    })
  }

  //create connection current selected device
  function deviceConnection(id: string) {
    createConnection(id).then(status => {
      console.log(status);
      setConnectionState("Connected");
      setShowToast(true);
      setButtonState(false);
      BluetoothSerial.write("START\n");
    }).catch((error) => setConnectionState(error));
  }

  //Light on/Light off
  function toggleLightButton(){
      if(toggleButtonState == false){
        console.log("Light ON")
        setToggleButton(true);
        sendDataCustomMessage("ON");
      }else{
        console.log("Light OFF")
        setToggleButton(false);
        sendDataCustomMessage("OFF");
      }

  }


//getting currect paired list via blutooth service 
  function DeviceList() {
    const addDevice = () => {
      let devices: [];
      searchBluetooth().then((device) => {
        var jsonObject = JSON.stringify(device);
        devices = JSON.parse(jsonObject);
        setDeviceList(devices);
        console.log(devicesList);
      });
    }
    return (
      <div>
        <IonButton color="warning" disabled={!buttonState} onClick={addDevice}>Add Device</IonButton>
        {devicesList.map((device) => (
          <IonCard key={device.id} style={{ padding: 10 }}>
            <IonCardTitle>{device.name}</IonCardTitle>
            <IonCardSubtitle>{device.address}</IonCardSubtitle>
            <IonButton color="light" onClick={() => deviceConnection(device.id)} disabled={!buttonState}>{!buttonState ? "Disconnect" : "Connect"}</IonButton>
          </IonCard>
        ))}
      </div>
    );
  }
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Tab 1</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        <IonHeader collapse="condense">
          <IonToolbar>
            <IonTitle size="large">BLUETOOTH</IonTitle>
          </IonToolbar>
        </IonHeader>

        <IonRow>
          <form onSubmit={handleSubmit(onSubmit)}>
            <IonRow>
              <IonInput disabled={buttonState} style={{ width: '250px' }} value={customMessage} placeholder="Enter Commands" onIonChange={e => setDataCustomMessage(e.detail.value!)}></IonInput>
              <IonButton onClick={() => sendDataCustomMessage(customMessage)} color="success" disabled={buttonState}>SEND DATA</IonButton>
            </IonRow>
          </form>
          <IonButton disabled={buttonState} onClick={toggleLightButton} color="danger">{toggleButtonState?'Light ON' : 'Light OFF'}</IonButton>
          <IonButton disabled={buttonState} onClick={disconnectDevice}>Disconnect</IonButton>
        </IonRow>
        <DeviceList></DeviceList>
        <IonCard>
          <IonCardHeader>
            <IonCardSubtitle>Data Receiver</IonCardSubtitle>
          </IonCardHeader>
          <IonCardContent>
            {rxMessage}
          </IonCardContent>
        </IonCard>
        <IonToast
          isOpen={showToast}
          onDidDismiss={() => setShowToast(false)}
          message={!buttonState ? "Disconnected" : "Connected"}
          duration={500}
        />
      </IonContent>
    </IonPage>
  );
};

export default Tab1;
