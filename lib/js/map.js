//Initialize Map
function createMap() {
    var map = L.map('map', {
        zoomControl: true,
    }).setView([65, -18], 7);

    map.dragging.disable();

    L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}', {
        attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
        maxZoom: 18,
        id: 'mapbox.streets',
        accessToken: 'pk.eyJ1IjoibWFycmVndWluIiwiYSI6ImNqeGZsN25wYTBsMGszeW9mNmh4OGN0MTYifQ.RI5iwBLQ3fqIQToOA_BpfQ',
    }).addTo(map);

    getData(map);
};


//popups
function onEachFeature(feature, layer) {
    //no property named popupContent; instead, create html string with all properties
    var popupContent = "";
    if (feature.properties) {
        //loop to add feature property names and values to html string
        for (var property in feature.properties) {
            popupContent += "<p>" + property + ": " + feature.properties[property] + "</p>";
        }
        layer.bindPopup(popupContent);
    };
};

function calcPropRadius(attValue) {
    //scale factor to adjust symbol size evenly
    var scaleFactor = 100;
    //area based on attribute value and scale factor
    var area = attValue * scaleFactor;
    //radius calculated based on area
    var radius = Math.sqrt(area / Math.PI);

    return radius;
};

function pointToLayer(feature, latlng, attributes) {
    //Determine which attribute to visualize with proportional symbols
    //attribute was set to attributes[0]
    //changed to [-1] so the map would start off without tiny dots
    //tiny dots were caused by the way data was formatted
    var attribute = attributes[0];

    //create marker options
    var options = {
        fillColor: "#ff7800",
        color: "#000",
        weight: 1,
        opacity: 1,
        fillOpacity: 0.8
    };

    //For each feature, determine its value for the selected attribute
    var attValue = Number(feature.properties[attribute]);

    //Give each feature's circle marker a radius based on its attribute value
    options.radius = calcPropRadius(attValue);

    //create circle marker layer
    var layer = L.circleMarker(latlng, options);

    //build popup content string
    var panelContent = "<p><b>Volcano:</b> " + feature.properties.Name + "</p><p><b>" + "Volcanic Explosivity Index" + ":</b> " +
        //.Volcanic Explosivity Index was [attribute]
        //changed to fix side panel description
        //was showing up as 'undefined'
        feature.properties.VolcanicExplosivityIndex + "</p><p><b>" + "Year" + ":</b> " + feature.properties.Year + "</p>";

    var popupContent = "<p><b>Volcano:</b> " + feature.properties.Name + "</p><p><b>Volcanic Explosivity Index in " + feature.properties.Year + ":</b> " + feature.properties.VolcanicExplosivityIndex + "</p><p><b>Elevation:</b> " + feature.properties.Elevation + " ft" + "</p><p><b>Type:</b> " + feature.properties.Type + "</p><p><b>Number of Deaths:</b> " + feature.properties.Deaths;

    //bind the popup to the circle marker
    layer.bindPopup(popupContent, {
        //add offset to avoid flicker
        offset: new L.Point(0, -options.radius),
        closeButton: false
    });

    //event listeners to open popup on hover
    layer.on({
        mouseover: function () {
            this.openPopup();
        },
        mouseout: function () {
            this.closePopup();
        },
        click: function () {
            $("#panel").html(panelContent);
        }
    });

    //return the circle marker to the L.geoJson pointToLayer option
    return layer;
};

//Add circle markers for point features to the map
function createPropSymbols(data, map, attributes) {
    //create a Leaflet GeoJSON layer and add it to the map
    L.geoJson(data, {
        pointToLayer: function (feature, latlng) {
            return pointToLayer(feature, latlng, attributes);
        }
    }).addTo(map);

};


function updatePropSymbols(map, attribute) {
    map.eachLayer(function (layer) {
        if (layer.feature && layer.feature.properties[attribute]) {
            //update the layer style and popup
            var props = layer.feature.properties;

            //update each feature's radius based on new attribute values
            var radius = calcPropRadius(props[attribute]);
            layer.setRadius(radius);

            //add volcano to popup content string
            var popupContent = "<p><b>Volcano:</b> " + props.Name + "</p><p><b>Elevation:</b> " + props.Elevation + " ft" + "</p><p><b>Type:</b> " + props.Type + "</p><p><b>Number of Deaths:</b> " + props.DEATHS;


            //add formatted attribute to panel content string
            var year = attribute.split("_")[1];
            popupContent += "<p><b>Volcanic Explosivity Index in " + year + ":</b> " + props[attribute];

            //replace the layer popup
            layer.bindPopup(popupContent, {
                offset: new L.Point(0, -radius)
            });
        };
    });
};

//create sequence controls
function createSequenceControls(map, attributes) {
    var SequenceControl = L.Control.extend({
        options: {
            position: 'bottomleft'
        },

        onAdd: function (map) {
            // create the control container div with a particular class name
            var container = L.DomUtil.create('div', 'sequence-control-container');

            //slider to map
            $(container).append('<input class="range-slider" type="range">');
            $(container).on('mousedown dblclick', function (e) {
                L.DomEvent.stopPropagation(e);
                L.DomEvent.disableClickPropagation(e);
            });

            //skip buttons to map
            $(container).append('<button class="skip" id="reverse" title="Reverse">Reverse</button>');
            $(container).append('<button class="skip" id="forward" title="Forward">Skip</button>');

            //kill any mouse event listeners on the map
            //$(container).on('mousedown dblclick', function (e) {
            //    L.DomEvent.stopPropagation(e);
            //});

            return container;
        }
    });

    map.addControl(new SequenceControl());

    //create range input element (slider)
    //$('#panel').append('<input class="range-slider" type="range">');
    //$('#panel').append('<button class="skip" id="reverse">Back</button>');
    //$('#panel').append('<button class="skip" id="forward">Skip</button>');
    $('#reverse').html('<img src="lib/leaflet/images/backward_small.png">');
    $('#forward').html('<img src="lib/leaflet/images/forward_small.png">');


    //slider attributes
    $('.range-slider').attr({
        max: 17,
        min: 0,
        value: 0,
        step: 1
    });



    //click listener for buttons
    $('.skip').click(function () {
        //get old index value
        var index = $('.range-slider').val();

        //increment or decrement depending on button clicked
        if ($(this).attr('id') == 'forward') {
            index++;
            //if past last attribute, wrap around to first attribute
            index = index > 17 ? 0 : index;
        } else if ($(this).attr('id') == 'reverse') {
            index--;
            //if past first attribute, wrap to last attribute
            index = index < 0 ? 17 : index;
        };

        $('.range-slider').val(index);
        updatePropSymbols(map, attributes[index]);
        updateLegend(map, attributes[index]);
    });

    //Step 5: input listener for slider
    $('.range-slider').on('input', function () {
        var index = $(this).val();
        console.log(index)
        updatePropSymbols(map, attributes[index]);
        updateLegend(map, attributes[index]);

    });

};

//Calculate the max, mean, and min values for a given attribute
function getCircleValues(map, attribute) {
    //start with min at highest possible and max at lowest possible number
    var min = Infinity,
        max = -Infinity;

    map.eachLayer(function (layer) {
        //get the attribute value
        if (layer.feature) {
            var attributeValue = Number(layer.feature.properties[attribute]);

            //test for min
            if (attributeValue < min) {
                min = attributeValue;
            };

            //test for max
            if (attributeValue > max) {
                max = attributeValue;
            };
        };
    });

    //set mean
    var mean = (max + min) / 2;

    //return values as an object
    return {
        max: max,
        mean: mean,
        min: min
    };
};


function updateLegend(map, attribute) {
    //create content for legend
    var year = attribute.split("_")[1];
    var content = "Eruption in " + year;

    //replace legend content
    $('#temporal-legend').html(content);

    //get the max, mean, and min values as an object
    var circleValues = getCircleValues(map, attribute);

    for (var key in circleValues) {
        //get the radius
        var radius = calcPropRadius(circleValues[key]);

        //Step 3: assign the cy and r attributes
        $('#' + key).attr({
            cy: 37 - radius,
            r: radius
        });

        $('#' + key + '-text').text("VEI: " + Math.round(circleValues[key] * 100) / 100);
    };
};

function createLegend(map, attributes) {
    var LegendControl = L.Control.extend({
        options: {
            position: 'bottomright'
        },

        onAdd: function (map) {
            // create the control container with a particular class name
            var container = L.DomUtil.create('div', 'legend-control-container');

            $(container).append('<div id="temporal-legend">')

            var svg = '<svg id="attribute-legend" width="160px" height="60px">';

            //array of circle names to base loop on
            var circles = ["max", "mean", "min"];

            //Step 2: loop to add each circle and text to svg string
            for (var i = 0; i < circles.length; i++) {
                //circle string
                svg += '<circle class="legend-circle" id="' + circles[i] +
                    '" fill="#F47821" fill-opacity="0.8" stroke="#000000" cx="30"/>';

                //text string
                svg += '<text id="' + circles[i] + '-text" x="80" y="35"></text>';
            };

            //close svg string
            svg += "</svg>";

            //add attribute legend svg to container
            $(container).append(svg);

            return container;

        }
    });

    map.addControl(new LegendControl());

    updateLegend(map, attributes[0]);
};

function processData(data) {
    //empty array to hold attributes
    var attributes = [];

    var properties = data.features[0].properties;

    //push each attribute name into attributes array
    for (var attribute in properties) {
        //only take attributes with population values
        if (attribute.indexOf("VEI") > -1) {
            attributes.push(attribute);
        };
    };

    //check result
    console.log(attributes);

    return attributes;
};



//Step 2: Import GeoJSON data
function getData(map) {
    //load the data
    $.ajax("data/Volcanos2.geojson", {
        dataType: "json",
        success: function (response) {
            //create array to hold attributes
            var attributes = processData(response);

            //call function to create proportional symbols
            createPropSymbols(response, map, attributes);
            createSequenceControls(map, attributes);
            createLegend(map, attributes);
        }
    });
};


//call create map function
$(document).ready(createMap);
