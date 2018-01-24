import React, { Component } from 'react';
import './App.css';
import './c3.css';
import C3Chart from 'react-c3js';
import d3 from 'd3';
import LatestValue from './LatestValue/LatestValue';
import Dropdown from 'react-dropdown';

class App extends Component {
  //state property
  state = {
    currencies:[
      {symbol:'USD', name: 'Dólar americano'},
      {symbol:'JPY', name: 'Yen Japonés'},
      {symbol:'DKK', name: 'Corona danesa'},
      {symbol:'GBP', name: 'Libra esterlina'},
      {symbol:'SEK', name: 'Corona sueca'},
      {symbol:'CHF', name: 'Franco suizo'},
      {symbol:'NOK', name: 'Corona noruega'},
      {symbol:'RUB', name: 'Rublo ruso'},
      {symbol:'BRL', name: 'Real brasileño'},
      {symbol:'CAD', name: 'Dólar canadiense'},
      {symbol:'CNY', name: 'Yuan chino'},
      {symbol:'ILS', name: 'Shekel israelí'},
      {symbol:'INR', name: 'Rupia hindú'},
      {symbol:'KRW', name: 'Won sudcoreano'},
      {symbol:'THB', name: 'Baht tailandés'},
      {symbol:'ZAR', name: 'Rand sudafricano'},
      {symbol:'EUR', name: 'Euro'}
    ],
    scopes: [
      {id:1, name:'semana'},
      {id:2, name:'mes'},
      {id:3, name:'año'},
      {id:4, name:'década'}
    ],
    selectedCurrency: 'USD',
    currencyName: 'Selecciona una divisa',
    selectedScope: 2,
    latestRate: "",
    data: {},
    axis: {},
    ready: false
  }

/*
  *  Triggers the application when the user selects a currency to compare with the mexican peso.
  *  @params the option selected by the user
  *
*/
  onSelect = (option) =>{
    //determine correct symbol and set state
    const currencyIndex = this.state.currencies.findIndex(p => {
      return p.name === option.label;
    });
    const currencySymbol= this.state.currencies[currencyIndex].symbol;
    this.setState({selectedCurrency: currencySymbol});
    this.setState({currencyName: option.label})
    console.log('The symbol is now: ',currencySymbol);
    this.fixerIOinquiry(currencySymbol,this.state.selectedScope);
  }

/*
  * Helper function to run an asynchronous loop that depends on the information fetched from
  * the fixer.io server.
  * @params
  *   - iterations to be run
  *   - process to be excecuted
  *   - callback when the loop has finally finished
*/
syncLoop = (iterations, process, exit) =>{
    var index = 0,
        done = false,
        shouldExit = false;
    var loop = {
        next:function(){
            if(done){
                if(shouldExit && exit){
                    return exit(); // Exit if we're done
                }
            }
            // If we're not finished
            if(index < iterations){
                index++; // Increment our index
                process(loop); // Run our process, pass in the loop
            // Otherwise we're done
            } else {
                done = true; // Make sure we say we're done
                if(exit) exit(); // Call the callback on exit
            }
        },
        iteration:function(){
            return index - 1; // Return the loop number we're on
        },
        break:function(end){
            done = true; // End the loop
            shouldExit = end; // Passing end as true means we still call the exit callback
        }
    };
    console.log("next loop iteration");
    loop.next();
    return loop;
}




/*
  *   Core of the application. Once the currency symbol of the selected option is determined,
  *   the application fetches the necessary data from the fixer.io website.
  *   @params
  *     - currencySymbol is the symbol of the selected option by the user
  *     - scopeCase refers to the time range in which the data is to be fetched. At this point
  *         of the development only one week is supported
*/
  fixerIOinquiry = (currencySymbol,scopeCase) =>{
    var rates= 0;
    var newYdata= [];
    var newXdata= [];
    var latest= 0;

    let addData = () => {
      newYdata.unshift(rates.MXN);
      //handle async. update of state
      if(scopeCase === 2 && newYdata.length === 15){

        newYdata.unshift('Pesos mexicanos');
        //form the necessary parameters to use the c3 graph component and save them
        //  to the app's state
        let newData= {
          columns: [newYdata]
        };
        this.setState({data: newData});

        let newAxis={
          x: {
            type: 'category',
            categories: newXdata
          },
          y: {
            tick: {
            format: d3.format('.5f')
            }
          }         
        }
        this.setState({axis: newAxis});

        this.setState({ready: true});
        console.log("--- ready to plot");
      }
    }
    let addLatest= () =>{
      this.setState({latestRate: latest.MXN});
    }
    //different number of inquiries depending on the scopeCase parameter
    switch(scopeCase){
      //first case: data of last seven days
      case 1:
        for(var i=1; i<=7;i++){
          //syntesize required date in YYYY-MM-DD format
          var date= new Date();
          date.setDate(date.getDate() - i);
          var year= date.getFullYear();
          var month= date.getMonth() + 1;
          var monthSTR= "0"+month;
          monthSTR= monthSTR.substr(monthSTR.length - 2);
          var day= date.getDate();
          var daySTR= "0"+day;
          daySTR= daySTR.substr(daySTR.length - 2);
          var xValue= ""+monthSTR+"/"+daySTR;
          newXdata.unshift(xValue);
          var dateSTR= ""+year+"-"+monthSTR+"-"+day;
          fetch('https://api.fixer.io/'+dateSTR+'?base='+currencySymbol,
            {
            headers : { 
              'Content-Type': 'application/json',
              'Accept': 'application/json'
             }
           })
          .then((resp) => resp.json())
          .then((data) => rates = data.rates)
          .then(addData)
        }
        fetch('https://api.fixer.io/latest?base='+currencySymbol,
          {
          headers : {   
            'Content-Type': 'application/json',
            'Accept': 'application/json'
            }
          })
        .then((resp) => resp.json())
        .then((data) => latest = data.rates)
        .then(addLatest)
        break;
      //second case: data of the last month
      case 2:
        console.log('second case: one month');
        
        var monthLoop= this.syncLoop(15,function(loop){
            //syntesize required date in YYYY-MM-DD format
            date= new Date();
            var iteration= loop.iteration() + 1;
            console.log("iteration: "+iteration);
            date.setDate(date.getDate() - 2*loop.iteration());
            year= date.getFullYear();
            month= date.getMonth() + 1;
            monthSTR= "0"+month;
            monthSTR= monthSTR.substr(monthSTR.length - 2);
            day= date.getDate();
            daySTR= "0"+day;
            daySTR= daySTR.substr(daySTR.length - 2);
            xValue= ""+monthSTR+"/"+daySTR;
            newXdata.unshift(xValue);
            dateSTR= ""+year+"-"+monthSTR+"-"+day;
            console.log("date string: "+dateSTR);
            fetch('https://api.fixer.io/'+dateSTR+'?base='+currencySymbol,
              {
              headers : { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
               }
             })
            .then((resp) => resp.json())
            .then((data) => rates = data.rates)
            .then(function(){
              console.log("adding new Ydata");
              newYdata.unshift(rates.MXN);
              loop.next();
            })
        },function(){console.log("done with month loop")});  
        
        fetch('https://api.fixer.io/latest?base='+currencySymbol,
          {
          headers : {   
            'Content-Type': 'application/json',
            'Accept': 'application/json'
            }
          })
        .then((resp) => resp.json())
        .then((data) => latest = data.rates)
        .then(addLatest)
        break;
      default:
        fetch('https://api.fixer.io/latest?base='+currencySymbol,
          {
          headers : { 
            'Content-Type': 'application/json',
            'Accept': 'application/json'
           }
         })
        .then((resp) => resp.json())
        .then((data) => rates = data.rates)
        .then(addLatest)
    }
  }

  render() {
    // inline style for the dropdown menu
    const style_dropdown = {
      backgroundColor: 'white',
      font: 'inherit',
      border: '1px solid blue',
      padding: '8px',
      cursor: 'pointer',
      width: '140px',
      align: 'center'
    };

    const options = [
      'Dólar americano', 'Yen Japonés', 'Corona danesa', 'Libra esterlina', 'Corona sueca', 'Franco suizo', 'Corona noruega', 'Rublo ruso', 'Real brasileño', 'Dólar canadiense', 'Yuan chino', 'Shekel israelí', 'Rupia hindú', 'Won sudcoreano', 'Baht tailandés', 'Rand sudafricano', 'Euro' 
    ];

    const defaultOption = this.state.currencyName;

    // form a string to display an actualized date
    var rightNow = new Date();
    var day= rightNow.getDate();
    var month= rightNow.getMonth() + 1;
    let writtenMonths= ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
    var monthSTR= writtenMonths[month - 1];
    var year= rightNow.getFullYear();

    let textVar= "Consulta el tipo de cambio del peso mexicano al "+day+" de "+monthSTR+" del "+year;

    let chart = null;

    // Plot only when data is ready
    if(this.state.ready){
        chart= (
        <div>
          <C3Chart data={this.state.data} axis={this.state.axis}/>
          <LatestValue tipoDeCambio={this.state.latestRate} />
        </div>
      );
    }
    return (
        <div className="App">
          <h1> KONFÍO - TEST </h1>
          <h2> {textVar} </h2>
          <div style={{display: 'inline-block'}}>
            <span> Peso mexicano VS: </span>
            <div style= {style_dropdown}>
              <Dropdown options={options} onChange={this.onSelect} value={defaultOption} placeholder="Select an option" />
            </div>
          </div>
          {chart}
        </div>
    );
  }
}

export default App;
