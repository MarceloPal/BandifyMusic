/**
 * Controlador de Suscripciones — checkout de MercadoPago para Plan Premium.
 *
 * Endpoint:
 *   POST /api/subscriptions/checkout — genera preferencia de pago MP para la suscripción.
 */

const { MercadoPagoConfig, Preference } = require('mercadopago');

const mpClient = new MercadoPagoConfig({ accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN });

exports.checkout = async (req, res, next) => {
  try {
    const preference = new Preference(mpClient);
    const response = await preference.create({
      body: {
        items: [
          {
            title: 'Suscripción Premium Bandify',
            quantity: 1,
            unit_price: 2990,
            currency_id: 'CLP',
          },
        ],
        back_urls: {
          success: `${process.env.FRONTEND_URL || 'https://bandify-music-2167.vercel.app'}/planes?pago=exitoso`,
          failure: `${process.env.FRONTEND_URL || 'https://bandify-music-2167.vercel.app'}/planes?pago=error`,
          pending: `${process.env.FRONTEND_URL || 'https://bandify-music-2167.vercel.app'}/planes?pago=pendiente`,
        },
        auto_return: 'approved',
        external_reference: req.usuario?.id || null,
      },
    });

    res.json({ init_point: response.init_point });
  } catch (error) {
    next(error);
  }
};
