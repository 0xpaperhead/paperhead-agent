import numeral from 'numeral';

// ----------------------------------------------------------------------
type InputValue = string | number | null;

export class NumeralUtils{
  
  fNumber(number: InputValue, decimalPoints: number = 0) {
    return numeral(number).format(`0,0.${'0'.repeat(decimalPoints)}`);
  }
  
  fCurrency(number: InputValue) {
    const format = number ? numeral(number).format('$0,0.00') : '$0.00';
  
    return this.result(format, '.00');
  }

  
  fPercent(number: InputValue) {
    // this is 0 to 100
    const format = number ? numeral(Number(number) / 100).format('0.00%') : '0.0%';
  
    return this.result(format, '.00');
  }
  
  fPercent2(number: InputValue) {
    // this is 0 to 1
    const format = number ? numeral(number).format('0.00%') : '0.0%';
  
    return this.result(format, '.00');
  }
  
  fShortenNumber(number: InputValue) {
    const format = number ? numeral(number).format('0.00a') : '';
  
    return this.result(format, '.00');
  }
  
  fData(number: InputValue) {
    const format = number ? numeral(number).format('0.0 b') : '';
  
    return this.result(format, '.0');
  }
  
  private result(format: string, key = '.00') {
    const isInteger = format.includes(key);
  
    return isInteger ? format.replace(key, '') : format;
  }
}