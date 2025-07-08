import React, { useEffect } from 'react';

interface SubscriptionButtonProps {
  planId: string;
  label?: string;
}

const SubscriptionButton: React.FC<SubscriptionButtonProps> = ({ planId }) => {
  useEffect(() => {
    const scriptId = 'mp-button-loader';

    // Evita adicionar o script múltiplas vezes
    if (document.getElementById(scriptId)) {
      return;
    }

    const script = document.createElement('script');
    script.id = scriptId;
    script.type = 'text/javascript';
    script.async = true;
    script.src = `https://www.mercadopago.com.br/integrations/v1/web-payment-checkout.js`;
    script.dataset.preferenceId = planId;
    script.dataset.source = 'button';

    const buttonContainer = document.getElementById(`button-checkout-${planId}`);
    if (buttonContainer) {
      buttonContainer.appendChild(script);
    }

  }, [planId]);

  return <div id={`button-checkout-${planId}`}></div>;
};

export default SubscriptionButton; 