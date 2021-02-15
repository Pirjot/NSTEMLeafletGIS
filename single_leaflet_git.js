//single_leaflet_git.js, developed by Pirjot Atwal, supports one endpoint and simple functionality to push only
//NOTE: MAKE SURE TO INCLUDE FOLLOWING TAGS IN HTML FILE.
//<script src = "http://kjur.github.io/jsrsasign/jsrsasign-latest-all-min.js"></script>
//<script async defer src="https://apis.google.com/js/api.js"
// onload="this.onload=function(){};handleClientLoad()"
// onreadystatechange="if (this.readyState === 'complete') this.onload()">
// </script>
//<script src = "client_package.js"></script>

var gapiReady = false;

function handleClientLoad() {
    gapi.load('client:auth2', init());
}

async function init() {
    var cred2 = "PRIVATEKEY";
    var cred3 = 'SERVICEEMAIL';
    var cred4 = ["https://sheets.googleapis.com/$discovery/rest?version=v4"];
    var pHeader = {
        "alg": "RS256",
        "typ": "JWT"
    }
    var sHeader = JSON.stringify(pHeader);
    var pClaim = {};
    pClaim.aud = "https://www.googleapis.com/oauth2/v3/token";
    pClaim.scope = "https://www.googleapis.com/auth/drive";
    pClaim.iss = cred3;
    pClaim.exp = KJUR.jws.IntDate.get("now + 1hour");
    pClaim.iat = KJUR.jws.IntDate.get("now");

    var sClaim = JSON.stringify(pClaim);

    var key = cred2;
    var sJWS = KJUR.jws.JWS.sign(null, sHeader, sClaim, key);

    var XHR = new XMLHttpRequest();
    var urlEncodedData = "";
    var urlEncodedDataPairs = [];

    urlEncodedDataPairs.push(encodeURIComponent("grant_type") + '=' +
        encodeURIComponent("urn:ietf:params:oauth:grant-type:jwt-bearer"));
    urlEncodedDataPairs.push(encodeURIComponent("assertion") + '=' + encodeURIComponent(sJWS));
    urlEncodedData = urlEncodedDataPairs.join('&').replace(/%20/g, '+');

    XHR.addEventListener('load', async function (event) {
        var response = JSON.parse(XHR.responseText);
        const delay = (ms = 500) => new Promise(res => setTimeout(res, ms));
        while (!gapi.auth) {
            await delay(500);
        }
        gapi.auth.setToken({
            access_token: response["access_token"]
        });
        gapi.client.init({
            apiKey: 'APIKEY',
            discoveryDocs: cred4
        }).then(function () {gapiReady = true;}, error => console.log(error));
    });

    XHR.addEventListener('error', function (event) {
        console.log('Oops! Authentication went wrong.');
    });

    XHR.open('POST', 'https://www.googleapis.com/oauth2/v3/token');
    XHR.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
    XHR.send(urlEncodedData);
}

async function get(subsheet = "") {
    const delay = (ms = 500) => new Promise(res => setTimeout(res, ms));
    while (!gapiReady) {
        await delay(50);
    }
    var ENDURL = "SHEETURL";
    var ENDPOINT = new RegExp("\\/d\\/(.*?)(\\/|$)").exec(ENDURL)[1];
    return await gapi.client.sheets.spreadsheets.values.get({
        spreadsheetId: ENDPOINT,
        range: subsheet + '!A1:Z',
    }).then(function (response) {
        rows = response.result.values;
        if (!rows) {
            rows = [];
        }
        var rowMax = 0;
        for (var row of rows) {
            if (row.length > rowMax) {
                rowMax = row.length;
            }
        }
        for(var row of rows) {
            for (var i = rowMax - row.length; i > 0; i--) {
                row.push("");
            }
        }
        return rows;
    });
}

///////
///////
///////
///////

//mapping_api.js Written by Pirjot Atwal

/**
 * Must match corresponding harcoded values in init filter Names and indexAndFilters Names.
 */
var IDs = [
    ["button1", "WIF", "orange"],
    ["button2", "ACU", "blue"],
    ["button3", "HBCU", "green"],
    ["button4", "HSI", "red"]
];

class SmartMarker {
    constructor(info = {
        name: "DEFAULT",
        Lat: 0,
        Lon: 0,
        status: "off",
        filters: []
    }) {
        this.marker = L.circleMarker([info.Lat, info.Lon], {weight: 1, radius: 7});
        this.info = info;
        this.setupPopup();
    }
    addTo(map) {
        this.marker.addTo(map);
    }
    remove() {
        this.marker.remove();
    }
    setupPopup() {
        //University Name
        var popupHeading = "<h4>" + this.info.name + "</h4>";
        //Filters
        var subHeading = "<h6>";
        for (var filter of this.info.filters) {
            subHeading += filter[0] + ", ";
        }
        subHeading = subHeading.slice(0, -2) + "</h6>";
        //Address
        var popupText = "<p>" + this.info.address +  "</p>";
        this.marker.bindPopup(popupHeading + subHeading + popupText).openPopup();
    }
    toggle(filter) {
        for (var item of this.info.filters) {
            if (item[0] == filter) {
                if (item[1] == "on") {
                    item[1] = "off";
                } else {
                    item[1] = "on";
                }
            }
        }
        this.updateStatus();
    }
    updateStatus() {
        var myStatus = "off";
        for (var item of this.info.filters) {
            if (item[1] == "on") {
                myStatus = "on";
                this.marker.setStyle({color: item[2], fillColor: item[2]});
            }
        }
        this.info.status = myStatus;
    }
}

class NSTEMMap {
    constructor(id) {
        this.divID = id;
        this.markers = [];
        this.createMap();
    }
    async createMap(Lat = 0, Lon = 0, View = 1) {
        //Create Map
        this.mymap = L.map(this.divID, {
            preferCanvas: true
        }).setView([Lat, Lon], View);
        //Set Tiles
        var tileURL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
        var attribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
        this.tiles = L.tileLayer(tileURL, {
            attribution
        });
        this.tiles.addTo(this.mymap);
        //Set Map Bounds
        this.mymap.setMinZoom(2);
        this.mymap.setMaxBounds([
            [90, -180],
            [-90, 180]
        ]);
        this.mymap.fitBounds([
            [52, -124],
            [21, -67]
        ]);
        //Compass
        this.mymap.addControl(new L.Control.Compass());
        //Panning
        L.control.pan().addTo(this.mymap);
        //Search Control Button
        this.searchControl = L.esri.Geocoding.geosearch().addTo(this.mymap);
        this.searchControl.on('results', function (data) {});
    }
    addMarker(marker) {
        if (!this.markers.includes(marker)) {
            this.pushMarker(marker)
        }
        if (marker.info.status == "on") {
            marker.addTo(this.mymap);
        }
    }
    pushMarker(marker) {
        this.markers.push(marker);
    }
    createMarker(info) {
        var marker = new SmartMarker(info);
        this.pushMarker(marker);
        this.addMarker(marker);
    }
    hideMarker(marker) {
        if (this.markers.includes(marker) && marker.info.status == "off") {
            marker.remove();
        }
    }
    toggleFilter(filter = "NI") {
        for (var item of this.filters) {
            if (item.name == filter) {
                if (item.status == "off") {
                    item.status = "on";
                } else {
                    item.status = "off";
                }
            }
        }
        for (var marker of this.markers) {
            marker.toggle(filter);
            if (marker.info.status == "on") {
                this.addMarker(marker);
            } else {
                this.hideMarker(marker);
            }
        }
    }
    async init() {
        //Initialize Filters
        this.filters = [];
        var filterNames = IDs.map((item) => item[1]);
        for (var item of filterNames) {
            this.filters.push({
                name: item,
                status: "off"
            });
        }
        //Parse Info and Initialize Markers
        this.rows = await get();
        var infos = [];
        for (var row of rows.slice(1)) {
            if (row && row.length >= rows[0].length && row[0] && row[6] && row[7]) {
                var info = {};
                info.name = row[0];
                info.address = row[1];
                info.Lat = parseFloat(row[6]);
                info.Lon = parseFloat(row[7]);
                var filters = [];
                //Must match IDs
                var indexAndFilters = [
                    [8, "WIF", "orange"],
                    [9, "ACU", "blue"],
                    [10, "HBCU", "green"],
                    [11, "HSI", "red"]
                ];
                for (var item of indexAndFilters) {
                    if (row[item[0]]) {
                        filters.push([item[1], "off", item[2]]);
                    }
                }
                info.status = "off";
                info.filters = filters;
                infos.push(info);
            }
        }
        for (var item of infos) {
            this.pushMarker(new SmartMarker(item));
        }
        //Initialize Buttons
        function attachToButton(map, id, value, color) {
            var button = document.getElementById(id);
            button.on = false;
            button.addEventListener("click", (evt) => {
                button.on = !button.on;
                if (button.on) {
                    button.style = "background-color: " + color;
                } else {
                    button.style = "";
                }
                map.toggleFilter(value);
            });
        }
        for (var item of IDs) {
            attachToButton(this, item[0], item[1], item[2]);
        }
        //Turn on NI
        document.getElementById("button1").click();
        //Initialize Search Engine
        await this.initSearchEngine();
    }
    async initSearchEngine() {
        //Get Search Bar and Menu with Filters
        var map = this.mymap;
        var searchText = document.getElementById("mySearch");
        var menu = document.getElementById("myMenu");
        //Remove Loading... Place holder list item
        var currentLIChildren = menu.getElementsByTagName("li");
        while (currentLIChildren.length > 0) {
            menu.removeChild(currentLIChildren[0]);
        }
        //Function for Map Viewing Ability
        //Turns On Marker selected if it is off (by clicking correct button)
        function view(li, marker) {
            li.addEventListener("click", function (evt) {
                map.setView([marker.info.Lat, marker.info.Lon], 13);
                if (marker.info.status == "off" && marker.info.filters.length > 0) {
                    var tagToTurnOn = marker.info.filters[0][0];
                    for (var id of IDs) {
                        if (id[1] == tagToTurnOn) {
                            var buttonToClick = document.getElementById(id[0]);
                            buttonToClick.click();
                            break;
                        }
                    }
                }
            });
        }
        //For Each Marker, Add a List Item to the Menu
        for (var marker of this.markers) {
            //Add All Elements
            var li = document.createElement("li");
            var div = document.createElement("div");
            var text1 = document.createElement("p");
            text1.textContent = marker.info.name;
            var text2 = document.createElement("p");
            text2.textContent = marker.info.address;
            div.appendChild(text1);
            div.appendChild(text2);
            li.appendChild(div);
            menu.appendChild(li);
            //When a Li is clicked upon, it will tell the map to zoom to that marker
            view(li, marker);
        }

        //Give the Search Menu Ability to hide li elements
        function search(evt) {
            var find = searchText.value.toUpperCase();
            var div = null;
            for (var li of currentLIChildren) {
                div = li.getElementsByTagName("div")[0];
                var text1 = div.getElementsByTagName("p")[0];
                var text2 = div.getElementsByTagName("p")[1];
                if (text1.textContent.toUpperCase().includes(find) ||
                    text2.textContent.toUpperCase().includes(find)) {
                    li.style.display = "";
                } else {
                    li.style.display = "none";
                }
            }
        }
        searchText.onkeyup = search;
    }
}

var myMap = null;

async function instruct() {
    if (document.getElementById("mapid") == undefined) {
        return;
    }
    console.log("MAP LOADING...");
    myMap = new NSTEMMap('mapid');
    await myMap.init();
    console.log('Map Loaded!');
}

document.addEventListener("DOMContentLoaded", (evt) => {
    instruct();
});