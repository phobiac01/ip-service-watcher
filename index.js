var fetch = require("fetch").fetchUrl;
const lookup = require("dns-lookup");
var previousAddress, httpState, previousHttpState;

// Change these parameters to fit your query
// =======================================================================================

// DO NOT USE HTTP OR HTTPS, Just use plain domain name: "www.example.com"
let trackedDomain = "members.heatsynclabs.org";

// Change to false to ignore tracking of HTTP service status
const trackingHttpServiceState = true;

// Refresh Interval in ms
const refreshInterval = 2000;

// =======================================================================================

if (!trackedDomain.includes("http://") && !trackedDomain.includes("https://")) {
  var trackedService = "http://" + trackedDomain;
}

let firstRound = true;
checkAddress();

async function checkAddress() {
  // Get status of the service running on the provided domain
  if (trackingHttpServiceState) {
    await fetchService();
  }

  lookup(trackedDomain, (err, address, family) => {
    // Save results from first round to report ant changes
    if (firstRound) {
      firstRound = !firstRound;
      previousAddress = address;
      previousHttpState = httpState;

      console.log("] Now tracking domain " + trackedDomain + " for changes...");
      console.log("Initial IP is: " + address);
      if (trackingHttpServiceState)
        console.log("State of http service:", previousHttpState);

      // Else check for changes and notify when found
    } else {
      // Check for change in DNS address
      if (address !== previousAddress) {
        console.log(
          trackedDomain +
            " has changed address from " +
            previousAddress +
            " to " +
            address
        );
      }

      // Check for change in http state
      if (httpState !== previousHttpState && trackingHttpServiceState) {
        console.log(
          "Http state has changed from " +
            previousHttpState +
            " to " +
            httpState
        );
      }
      previousAddress = address;
      previousHttpState = httpState;
    }
  });

  setTimeout(() => {
    checkAddress();
  }, refreshInterval);
}

// Update status of service on port 80
async function fetchService() {
  let activeSesh = true;

  return new Promise((resolve, reject) => {
    setTimeout(
      () => {
        httpState = "assumed down";
        activeSesh = false;
        resolve();
      },
      refreshInterval - (refreshInterval >= 900) ? 200 : 0
    );

    fetch(trackedService, { timeout: 750 }, function (error, meta, body) {
      if (activeSesh) {
        if (error) {
          console.error(error);
          reject(new Error(error));
        } else if (meta) {
          httpState = meta.status == 200 ? "up" : "down";
          resolve();
        } else {
          httpState = "down";
          resolve();
        }
      }
    });
  });
}

// DNS IP and Status watcher / resolver built by BlueDragonDev
