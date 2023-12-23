// JavaScript code to show up an forecast of the energy costs as widget in iOS.
// Prerequisites: Install the "SCRIPTABLE" app from the iOS appstore
//
// This script uses the API from aWATTar (see https://www.awattar.com/services/api) for further details.
// Version 0.22 beta
// License: Feel free to modify :-)

const mwst         = 1.19         //Aktueller Steuersatz
const price_unit   = 'Cent/kWh'   //Preis Einheit
const max_level    = 50           //Höchster rechnerischer Schwellwert. Diesen Wert bitte nicht ändern
const red_level    = 40           //Schwellwert ab dem der aktuelle Preis bzw. der zugehörige Balken rot eingefärbt wird
const orange_level = 30           //Schwellwert ab dem der aktuelle Preis bzw. der zugehörige Balken orange eingefärbt wird. Kleinere Werte werden grün eingefärbt.
 

let actual_year             = new Date().getFullYear( ); let actual_month = new Date().getMonth( ); 
const today                 = new Date();
const tomorrow              = new Date(today);
tomorrow.setDate(tomorrow.getDate()+1)
let date_tomorrow           = tomorrow.getDate();

let day_from                = new Date(actual_year, actual_month, date_tomorrow , 0, 0).getTime();
let day_price_url           = "https://api.awattar.at/v1/marketdata?start="+day_from;

var raw_data_day            = await new Request(day_price_url).loadJSON();    //Preis für den aktuellen Tag via API holen

var number_of_lines = raw_data_day.data.length;

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
  if (price < lowest_rate) { lowest_rate = price;
                             var best_price_intervall = new Date(raw_data_day.data[i].start_timestamp).getHours() + ":00 - " + new Date(raw_data_day.data[i].end_timestamp).getHours() + ":00"
                            
      }
  }
  if (lowest_rate === 99999) { lowest_rate = 0 }
  return [ lowest_rate / 10 * mwst, best_price_intervall]
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
  let maxi = financial(max());
  let context = new DrawContext()
  context.size = new Size(width, height+70)
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
   
    let x = (index * 2 ) * w
    let y = height - h
 
    let rect = new Rect(x, y, w, h)
    context.fillRect(rect)
    })
  return context
}

//Verarbeitungsblock
 let minimum = financial(min()[0]) //Runde den niedrigsten Tagespreise auf zwei Nachkommastellen
 let maximum = financial(max()) //Runde den höchsten Tagespreis auf zwei Nachkommastellen
 

// das Widget
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
 
  const header = list.addText("🔌 Vorhersage".toUpperCase())
  header.font = Font.mediumSystemFont(13)
 
  let day;
  day = list.addDate(new Date(tomorrow))
  day.font = Font.systemFont(12)
 
  
  if (number_of_lines < 24) { 
      list.addSpacer();
      var label = list.addText("🔮Preise noch nicht bekannt")
        label.font = Font.boldSystemFont(14)
        label.textColor = Color.red() }
   else { label = list.addText("Bestpreis:" )
        label.font = Font.systemFont(12)
        let label_bp = list.addText(min()[1])
        label_bp.font = Font.systemFont(12)  
        }
           
    
 
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
