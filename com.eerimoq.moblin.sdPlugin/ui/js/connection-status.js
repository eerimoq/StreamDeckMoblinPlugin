const { streamDeckClient } = SDPIComponents;

function init() {
  const connectionStatus = document.getElementById("connectionStatus");
  streamDeckClient.sendToPropertyInspector.subscribe((ev) => {
    if (ev.payload?.event !== "connectionStatus") {
      return;
    }
    connectionStatus.value = ev.payload.value;
  });
  streamDeckClient.send("sendToPlugin", { event: "requestConnectionStatus" });
}

document.addEventListener("DOMContentLoaded", init, { once: true });
