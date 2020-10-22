// JavaScript code to show up the actual energy costs as widget in iOS.
// Prerequisites: Install the "SCRIPTABLE" app from the iOS appstore
//
// This script uses the API from aWATTar (see https://www.awattar.com/services/api) for further details.
// Version 0.2 beta
// License: Feel free to modify :-)
const mwst         = 1.16         //Aktueller Steuersatz
const price_unit   = 'Cent/kWh'   //Preis Einheit
const max_level    = 50           //Höchster rechnerischer Schwellwert. Diesen Wert bitte nicht ändern
const red_level    = 40           //Schwellwert ab dem der aktuelle Preis bzw. der zugehörige Balken rot eingefärbt wird
const orange_level = 30           //Schwellwert ab dem der aktuelle Preis bzw. der zugehörige Balken orange eingefärbt wird. Kleinere Werte werden grün eingefärbt.

let actual_hour             = new Date().getHours( );
let to_hour                 = actual_hour +1;
let actual_year             = new Date().getFullYear( ); let actual_month = new Date().getMonth( ); let actual_date  = new Date().getDate( );
var time_from               = new Date(actual_year, actual_month, actual_date, actual_hour, 0).getTime();
let time_to                 = new Date(actual_year, actual_month, actual_date, to_hour, 0).getTime();
let actual_price_url        = "https://api.awattar.de/v1/marketdata?start="+time_from+"&end="+time_to;
let day_from                = new Date(actual_year, actual_month, actual_date, 0, 0).getTime();
let day_price_url           = "https://api.awattar.de/v1/marketdata?start="+day_from; 

var raw_data                = await new Request(actual_price_url).loadJSON(); //Aktuellen Preis via API holen
var raw_data_day            = await new Request(day_price_url).loadJSON();    //Preis für den aktuellen Tag via API holen
var price_color  = Color.green(); //Farbe für den aktuellen Preis inital auf grün setzen.

// Block mit Funktionen die benötigt werden
// Funktion um Dezimalzahlen auf zwei Nachkommastellen zu runden
function financial(x) { 
  return Number.parseFloat(x).toFixed(2); }

// Funktion um den niedrigsten Tagespreis zu ermitteln
function min() {
  let lowest_rate  = 99999
  for (i in raw_data_day.data)
  {
  let price = raw_data_day.data[i].marketprice;
  if (price < lowest_rate) { lowest_rate = price } 
    }
  return lowest_rate / 10 * mwst
}

//Funktion um den höchsten Tagespreis zu ermitteln
function max() {
  let highest_rate  = 0
  for (i in raw_data_day.data)
  {
  let price = raw_data_day.data[i].marketprice;
  if (price > highest_rate) { highest_rate = price } 
    }
  return highest_rate / 10 * mwst
}

//Funktion um das Balkendiagramm zu zeichnen
function columnGraph(data, width, height, colour) {
  let maxi = financial(max()) 
  let context = new DrawContext()
  context.size = new Size(width, height+30)
  context.opaque = false
  context.setFillColor(colour)
  data.forEach((value, index) => {
    let p = value.marketprice / 10 * mwst
    let w = width / (2 * data.length - 1)
    let h = p / maxi * height
    if(h>height) { h = height }
    context.setFillColor(Color.green())
    
    if(h > orange_level) { context.setFillColor(Color.orange()) }
    if(h > red_level) { context.setFillColor(Color.red()) }
    
    let x = (index * 2 + 1) * w
    let y = height - h

    let rect = new Rect(x, y, w, h)
    context.fillRect(rect)
	//Nachfolgend wird der Balken für das aktuelle Zeitintervall ermittelt und markiert
    if(time_from === value.start_timestamp) { 
       if(index === 0) { var marker = 0 }
       else { marker = ( (index - 1 ) * 2 + 1 ) * w + 10; }
       context.drawText("🔺", new Point( marker, height + 10 )) }
    
  })
  return context
}

//Verarbeitungsblock
let minimum = financial(min()) //Runde den niedrigsten Tagespreise auf zwei Nachkommastellen
let maximum = financial(max()) //Runde den höchsten Tagespreis auf zwei Nachkommastellen

let attr = raw_data.data[0].marketprice //Ermittle den aktuellen Strompreis
let unit = raw_data.data[0].unit        //Ermittle die zugehörige Preiseinheit
var actual_price = attr / 10 * mwst     //Errechne den aktuellen Strompreis (brutto)


//Erzeuge das Widget
let widget = await createWidget()
if (!config.runsInWidget) {
  await widget.presentSmall()
}

Script.setWidget(widget)
Script.complete()

async function createWidget(items) {
  let location
  
  const list = new ListWidget()
  
// Im Darkmode die Hintergrundfarben ändern. Funktioniert derzeit nicht zuverlässig
/*   if(Device.isUsingDarkAppearance()){
    const gradient = new LinearGradient()
    gradient.locations = [0, 1]
    gradient.colors = [
      new Color("111111"),
      new Color("222222")
    ]
    list.backgroundGradient = gradient
   
  } */
  
  const header = list.addText("🔌 Börsenpreis".toUpperCase())
  header.font = Font.mediumSystemFont(13)
  
  let day;
  day = list.addDate(new Date())
  day.font = Font.systemFont(12)
  
  list.addSpacer()
 
  var price_label = financial(actual_price)+""  //Konvertiere numerischen Wert in einen String
  
  var label = list.addText(price_label + " "+ price_unit)
  label.font = Font.boldSystemFont(16)
  
  //Nachfolgend wird der Schwellwert für das Einfärben des Preises
  let h = actual_price / maximum * max_level
  if(h > max_level) { h = max_level }
  if(h > orange_level) { price_color = Color.orange()}
  if(h > red_level) { price_color = Color.red()}
  
  label.textColor = price_color
  
  //Ausgabe des Zeitintervalls für den aktuellen Preis
  let time_range;
  time_range = list.addText(actual_hour+"" + ' ' + '-' + ' ' + to_hour+"" + ' ' +'Uhr')
  time_range.font = Font.systemFont(12)
  list.addSpacer()
  
  //Anzeige des Balkendiagramms
  let image = columnGraph(raw_data_day["data"], 400, max_level, Color.green()).getImage()
  log(image)
  list.addImage(image)
  
  
  //Ausgabe des minimalen und maximalen Tagespreis
  let price_range;
  
  price_range = list.addText("Min:" + minimum + " " + "Max:" + maximum)
  
  
  price_range.font = Font.systemFont(12)
  price_range.textColor = Color.gray()

return list

}

// Ausgabe einiger nützlicher Informationen

// log("From:" + " " + actual_hour) 
// log("To:" + " " + to_hour) 
// log("Raw Price:" + attr)
// log("Darkmode:" + Device.isUsingDarkAppearance())
