type PortfolioGalleryProps={images:string[];name:string;sample:boolean};

export function PortfolioGallery({images,name,sample}:PortfolioGalleryProps){
  const portfolio=images.length?images:['/occanova-logo.jpg'];
  const photo=(image:string,index:number)=><a key={`${image}-${index}`} href={image} target="_blank" rel="noreferrer" aria-label={`Open portfolio image ${index+1}`}><img src={image} alt={`${sample?'Illustrative event photograph':name+' portfolio'} ${index+1}`} loading={index===0?'eager':'lazy'} decoding="async"/></a>;
  return <section className="portfolio-section" aria-label="Portfolio photos"><div className="gallery portfolio-preview">{portfolio.slice(0,2).map(photo)}</div>{portfolio.length>2&&<details className="portfolio-more"><summary>View all {portfolio.length} portfolio photos</summary><div className="portfolio-grid">{portfolio.slice(2).map((image,index)=>photo(image,index+2))}</div></details>}</section>;
}
