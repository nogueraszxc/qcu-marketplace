import NextDocument, {Html,Head,Main,NextScript} from 'next/document';
export default class Document extends NextDocument {
 static async getInitialProps(context) {
  const initial = await NextDocument.getInitialProps(context);
  return {...initial, nonce: context.req?.headers['x-nonce']};
 }
 render(){return <Html lang="en" data-scroll-behavior="smooth"><Head nonce={this.props.nonce}><meta name="theme-color" content="#76253d"/></Head><body><Main/><NextScript nonce={this.props.nonce}/></body></Html>;}
}
