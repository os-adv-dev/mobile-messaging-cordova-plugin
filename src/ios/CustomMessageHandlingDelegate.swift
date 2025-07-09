//
//  CustomMessageHandler.swift
//  CordovaMobilePushDemo
//
//  Created by Olga Koroleva on 20.11.2024..
//

import Foundation
import MobileMessaging

@objc
class CustomMessageHandlingDelegate: NSObject, MMMessageHandlingDelegate {
    func willPresentInForeground(message: MM_MTMessage?, notification: UNNotification, withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
        var presentationOptions: UNNotificationPresentationOptions = []
        
        //check if notification should be displayed in NotificationCenter
        if message?.customPayload?["displayInNotificationCenter"] != nil {
            if #available(iOS 14.0, *) {
                presentationOptions.insert(.list)
            }
        }
        
        //check if notification should be displayed as a banner
        //if message?.inAppStyle == .Banner { as asked by infobip to allow showing push notifications with app in foreground
            if #available(iOS 14.0, *) {
                presentationOptions.insert([.banner, .list])
            } else {
                presentationOptions.insert(.alert)
            }
        //}

        //add default options if needed
        presentationOptions.insert([.badge, .sound])
        completionHandler(presentationOptions)
        
    }
}
