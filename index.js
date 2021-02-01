var fetch = require("fetch").fetchUrl;
const lookup = require("dns-lookup");
var previousAddress,
	httpState,
	previousHttpState = "";

// Change these parameters to fit your query
// =======================================================================================

// DO NOT USE HTTP OR HTTPS, Just use plain domain name: "www.example.com"
const trackedDomain = "www.example.com";

// Change to false to ignore tracking of HTTP service status
const trackServiceState = true;

// Check wether the service checker should use http or https
const useHttps = true;

// Use a specified port for the service checker (default port 80 for http(s) traffic)
const servicePort = 80;

// Refresh Interval in milliseconds
// This interval may take longer depending on the timeoutInterval value below
// You may want to disable service state tracking above if this is an issue
const refreshInterval = 5000;

// Ping Timeout in milliseconds
// How long a request will wait for the server before marking the service as down
// If your service has an abnormally long response time, setting this higher will help
const tiemoutInterval = 15000;

// Print timestamps to the console when updates occur
const useTimestamps = true;

// =======================================================================================

// Modify url to fit given parameters
if (!trackedDomain.includes("http://") && !trackedDomain.includes("https://")) {
	var trackedService =
		(useHttps ? "https://" : "http://") +
		trackedDomain +
		(servicePort != 80 ? ":" + servicePort : "");
}

let firstRound = true;
checkAddress();

setTimeout(() => {
	if (firstRound) console.log("] Please be patient, running intitial ping...");
}, 2000);

async function checkAddress() {
	// Resolve the given URL to an IP
	let resolvedAddress;

	lookup(trackedDomain, (err, address, family) => (resolvedAddress = address));

	// Get status of the service running on the provided domain
	if (trackServiceState) {
		await fetchService();
	}

	var datee = new Date();
	var timestamp = useTimestamps ? datee.toLocaleTimeString() + ":" : "";

	// Save results from first round to report ant changes
	if (firstRound) {
		firstRound = !firstRound;
		previousAddress = resolvedAddress;
		previousHttpState = httpState;

		console.log(timestamp, "] Now tracking domain " + trackedDomain + " for changes...");
		console.log(timestamp, "Initial IP is: " + resolvedAddress);
		if (trackServiceState)
			console.log(timestamp, "State of http service: " + previousHttpState);

		// Else check for changes and notify when found
	} else {
		// Check for change in DNS address
		if (resolvedAddress !== previousAddress) {
			console.log(
				timestamp,
				trackedDomain + " has changed address from " + previousAddress + " to " + resolvedAddress
			);
		}

		// Check for change in http state
		if (httpState !== previousHttpState && trackServiceState) {
			console.log(
				timestamp,
				"Http state has changed from " + previousHttpState + " to " + httpState
			);
		}
		previousAddress = resolvedAddress;
		previousHttpState = httpState;
	}

	setTimeout(() => {
		checkAddress();
	}, refreshInterval);
}

// Update status of service on port 80
async function fetchService() {
	let activeSesh = true;

	return new Promise((resolve, reject) => {
		// Timeout to handle lagging requests that dont reject immediately
		setTimeout(() => {
			httpState = "assumed down (timed out: >" + tiemoutInterval + "ms)";
			activeSesh = false;
			resolve();
		}, tiemoutInterval);

		fetch(trackedService, function (error, meta, body) {
			if (activeSesh) {
				if (error) {
					if (error.code === "ENOTFOUND") {
						httpState = "could not resolve ip";
					} else if (error.code === "EAI_AGAIN") {
						httpState = "network connectivity error";
					} else console.error(error);
					resolve();
				}

				if (meta) {
					httpState = "up " + (meta.status === "200" ? "" : "(" + meta.status + ")");
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
