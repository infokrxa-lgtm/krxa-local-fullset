/* PATCH79_TRAVEL_SEARCH_FLOW_MARKER */
try{ if(window.KRXA_FLOW_LOCK){ window.KRXA_FLOW_LOCK.setFlow('travel_search',{source:'ui/js/travel_v2_flow.js'}); } }catch(e){}

/* travel_v2_flow.js */
(function(){
  if(window.KRXA_TRAVEL_V2_FLOW_LOADED){ return; }
  window.KRXA_TRAVEL_V2_FLOW_LOADED = true;
  window.KRXA_TRAVEL_V2 = {
    reflection:null,
    currentStep:"home",
    async load(){
      try{
        const res = await fetch("/api/travel-v2/reflection?ts="+Date.now());
        const data = await res.json();
        this.reflection = data.reflection || null;
        return this.reflection;
      }catch(e){
        console.warn("[TravelV2] reflection load failed", e);
        return null;
      }
    },
    setStep(step){
      this.currentStep = step || "home";
      document.body.setAttribute("data-travel-v2-step", this.currentStep);
    },
    progressLabels(){
      const ux = this.reflection && this.reflection.ux;
      return ux && ux.steps ? ux.steps.map(s => s.label || s.name) : ["현재","목적","추천","상세","실행","AI","기록"];
    }
  };
  document.addEventListener("DOMContentLoaded", function(){
    window.KRXA_TRAVEL_V2.load();
  });
})();
