/** A slowly turning black-and-white cube of the formats you get; it pauses while you point at it. Pure CSS. */
export default function Cube() {
  return (
    <div className="cube-wrap" aria-hidden="true">
      <div className="cube">
        <div className="f f1">.SRT</div>
        <div className="f f2"><span lang="ta">தமிழ்</span></div>
        <div className="f f3">.VTT</div>
        <div className="f f4">English</div>
        <div className="f f5">Pr</div>
        <div className="f f6">Ae</div>
      </div>
    </div>
  );
}
