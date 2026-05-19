import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

const stripe = new Stripe('sk_test_sk_test_51TY2YxPaFwDSn8ikmp4GRTI2LsAAeA3pvHGGuXqytk0xDxDYOMhLqCvKFd6wE51GKYpsI9EpzmhHgdLfagidqI4U00uxAfNKJe', {
  apiVersion: '2024-12-18.acacia',
})

export async function POST(req: NextRequest) {
  try {
    const { address } = await req.json()

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [
        {
          price_data: {
            currency: 'jpy',
            product_data: {
              name: 'DeFi Portfolio Manager Pro',
              description: 'ウォレット5つ・確定申告CSV・アラート無制限',
            },
            unit_amount: 980,
            recurring: { interval: 'month' },
          },
          quantity: 1,
        },
      ],
      metadata: { address },
      success_url: `${process.env.NEXT_PUBLIC_URL}/success`,
      cancel_url: `${process.env.NEXT_PUBLIC_URL}/`,
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}