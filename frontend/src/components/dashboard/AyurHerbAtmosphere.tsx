import fieldImage from "../../assets/field.jpeg";

export default function AyurHerbAtmosphere() {
  return (
    <div
      className="ayurherb-atmosphere"
      aria-hidden="true"
    >
      <div
        className="ayurherb-field-image"
        style={{
          backgroundImage: `url(${fieldImage})`,
        }}
      />

      <div className="ayurherb-field-fade" />
    </div>
  );
}